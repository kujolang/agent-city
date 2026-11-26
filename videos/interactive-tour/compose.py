"""Build the HyperFrames markup and player data from the chapter timing."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
chapters = json.loads((ROOT / "chapters.json").read_text())
timings = json.loads((ROOT / "timings.json").read_text())
rows = []
hosts = []
audio = []
cues = ["WEBVTT\n"]

def write(path, content):
    (ROOT / path).write_text(content, encoding="utf-8")

def stamp(seconds):
    millis = round(seconds * 1000)
    return f"{millis // 3600000:02}:{millis // 60000 % 60:02}:{millis // 1000 % 60:02}.{millis % 1000:03}"

start = 0
for index, (chapter, timing) in enumerate(zip(chapters, timings, strict=True)):
    row = {**chapter, **timing, "start": start}
    rows.append(row)
    chapter_id = chapter["id"]
    scene = f"stop-{chapter_id}"
    duration = timing["duration"]
    title, label, detail = (html.escape(chapter[key]) for key in ("title", "label", "detail"))
    focus_x, focus_y = timing["focus"]
    room = ""
    if chapter_id != "city":
        still = f'<img src="assets/frames/{chapter_id}.webp" alt="">'
        if "videoDuration" in timing:
            length = min(duration - .63, timing["videoDuration"])
            still += f'<video id="{scene}-footage" class="clip" data-start="0.63" data-duration="{length:.3f}" data-track-index="1" data-layout-allow-overlap muted playsinline src="assets/frames/{chapter_id}.mp4"></video>'
        room = f'      <div id="{scene}-interior" class="interior" data-layout-allow-overlap>{still}</div>'
    route = "".join(
        f'<span class="{"current" if index == i else "visited" if i < index else ""}"></span>'
        for i in range(len(chapters))
    )
    write(f"compositions/{scene}.html", f"""<template>
  <section id="root" class="tour-scene" data-composition-id="{scene}" data-width="1920"
    data-height="1080" data-duration="{duration}">
    <div class="plate" data-layout-allow-overflow data-layout-allow-overlap>
      <div id="{scene}-street" class="street" data-layout-allow-overlap>
        <img src="assets/frames/city.webp" alt="">
      </div>
{room}
    </div>
    <div id="{scene}-editorial" class="editorial">
      <p class="stop-label">{label}</p>
      <h1>{title}</h1>
      <p class="detail">{detail}</p>
    </div>
    <p class="wordmark">Agent City</p>
    <div class="route" aria-hidden="true">{route}</div>
    <script>window.buildCityStop("{scene}", {duration}, {focus_x}, {focus_y});</script>
  </section>
</template>
""")
    hosts.append(f'    <section id="{scene}" class="clip host" data-composition-id="{scene}" data-composition-src="compositions/{scene}.html" data-start="{start:.2f}" data-duration="{duration}" data-track-index="0" data-track-kind="graphics" data-layout-allow-overlap></section>')
    voice = start + timing["lead"]
    audio.append(f'    <audio id="voice-{chapter_id}" class="clip" data-start="{voice:.2f}" data-duration="{timing["speech"]}" data-track-index="2" src="assets/voice-{chapter_id}.mp3"></audio>')
    first, second = (s.replace("M C P", "MCP") for s in chapter["lines"])
    for begin, end, line in [(voice, voice + timing["break"], first), (voice + timing["break"], voice + timing["speech"], second)]:
        cues.append(f"{stamp(begin)} --> {stamp(end)}\n{line}\n")
    start = round(start + duration, 2)

write("captions.vtt", "\n".join(cues))
write("player/chapters.js", "const chapters = " + json.dumps(rows, indent=2) + ";\n")
write("index.html", f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Agent City · Interactive Tour</title>
  <link rel="stylesheet" href="film.css">
  <script src="assets/gsap.min.js"></script>
  <script src="assets/motion.js"></script>
  <script src="camera.js"></script>
</head>
<body>
  <main id="tour" data-composition-id="agent-city-tour" data-width="1920" data-height="1080" data-duration="{start}">
{chr(10).join(hosts)}
{chr(10).join(audio)}
    <audio id="score" class="clip" data-start="0" data-duration="{start}" data-track-index="3" src="assets/score.mp3"></audio>
    <audio id="effects" class="clip" data-start="0" data-duration="{start}" data-track-index="4" src="assets/effects.mp3"></audio>
  </main>
  <script>
    window.__timelines ??= {{}};
    window.__timelines["agent-city-tour"] = gsap.timeline({{ paused: true }});
  </script>
</body>
</html>
""")
