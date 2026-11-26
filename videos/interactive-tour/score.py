"""Synthesize the original instrumental and camera cues (requires NumPy and FFmpeg)."""
import json
import subprocess
from pathlib import Path

import numpy as np

RATE = 44100
BEAT = 60 / 92
timings = json.loads(Path("timings.json").read_text())
duration = round(sum(shot["duration"] for shot in timings), 2)
length = round(duration * RATE)
music = np.zeros((length, 2))
effects = np.zeros_like(music)
duck = np.ones(length)

def place(track, time, tone, pan=0):
    start = round(time * RATE)
    count = min(len(tone), len(track) - start)
    if count > 0:
        track[start:start + count] += tone[:count, None] * np.array([1 - pan, 1 + pan])

def clock(seconds):
    return np.arange(round(seconds * RATE)) / RATE

def note(midi, seconds, attack, decay, color=.18):
    t = clock(seconds)
    phase = 2 * np.pi * 440 * 2 ** ((midi - 69) / 12) * t
    envelope = np.minimum(1, t / attack) * np.exp(-t / decay)
    envelope *= np.clip((seconds - t) / .09, 0, 1)
    return envelope * (np.sin(phase) + color * np.sin(2 * phase) + .05 * np.sin(3 * phase))

voicings = [(45, 57, 60, 64, 71), (41, 57, 60, 65, 69),
            (48, 55, 60, 64, 71), (43, 55, 59, 62, 69)]
for bar in range(int(duration / (4 * BEAT)) + 1):
    time = bar * 4 * BEAT
    bass, *chord = voicings[bar % len(voicings)]
    for i, pitch in enumerate(chord):
        place(music, time, .024 * note(pitch, 4.3 * BEAT, .39, 2.4), (i - 1.5) * .27)
    for offset in (0, 2):
        place(music, time + offset * BEAT, .046 * note(bass, 1.7 * BEAT, .028, .32))
    for i, step in enumerate((0, 1.5, 2.5, 3.5)):
        pitch = chord[(i * 3 + bar) % 4] + 12
        bell = note(pitch, .8, .012, .21, .26)
        pan = -.34 if i % 2 == 0 else .34
        place(music, time + step * BEAT, .038 * bell, pan)
        place(music, time + step * BEAT + .24, .009 * bell, -pan)

time = 0
for index, shot in enumerate(timings):
    start = time + shot["lead"]
    end = start + shot["speech"]
    left = round(max(0, start - .25) * RATE)
    right = round(min(duration, end + .32) * RATE)
    t = np.arange(left, right) / RATE
    duck[left:right] = 1 - .48 * np.minimum(np.clip((t - start + .25) / .25, 0, 1),
                                          np.clip((end + .32 - t) / .32, 0, 1))
    if index > 0:
        t = clock(.65)
        envelope = np.sin(np.pi * t / .65) ** 2
        sweep = .024 * envelope * (np.sin(2 * np.pi * (110 * t + 140 * t * t))
                                   + .18 * np.sin(2 * np.pi * (390 * t + 400 * t * t)))
        place(effects, time + .12, sweep, .3 if index % 2 else -.3)
        place(effects, time + .83, .046 * note(81 if index != 5 else 88, .45, .012, .10), -.18)
    if index == 5:
        for step, pitch in enumerate((72, 76, 79)):
            place(effects, start + shot["break"] + step * .08, .028 * note(pitch, .6, .014, .20))
    time += shot["duration"]

t = clock(duration)
fade = np.minimum(np.clip(t / .52, 0, 1), np.clip((duration - t) / 1.25, 0, 1))
music *= (duck * fade)[:, None]

for name, track in (("score", music), ("effects", effects)):
    pcm = np.clip(track * 32767, -32768, 32767).astype("<i2")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "s16le",
                    "-ar", str(RATE), "-ac", "2", "-i", "pipe:0", "-b:a", "160k",
                    f"assets/{name}.mp3"], input=pcm.tobytes(), check=True)
