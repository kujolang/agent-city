const video = document.querySelector("video");
const stops = document.querySelector("#stops");
const transcript = document.querySelector("#transcript");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const captionTrack = video.addTextTrack("captions", "English", "en");
captionTrack.mode = "hidden";
const buttons = [];
let active = -1;
let animation;

function setActive(index) {
  if (active === index || index < 0) return;
  animation?.stop();
  const previous = buttons[active];
  previous?.removeAttribute("aria-current");
  if (previous) previous.style.backgroundColor = "";
  active = index;
  const button = buttons[active];
  button.setAttribute("aria-current", "true");
  if (!reducedMotion.matches) {
    animation = Motion.animate(button, { backgroundColor: ["#eee9da", "#d8e3d1"] },
      { duration: .48, ease: [.22, .83, .29, 1] });
    animation.then(() => { button.style.backgroundColor = ""; });
  }
}

function seek(index) {
  video.currentTime = chapters[index].start;
  setActive(index);
}

for (const [index, chapter] of chapters.entries()) {
  const row = document.createElement("li");
  const button = document.createElement("button");
  button.className = "stop";
  button.type = "button";
  const label = document.createElement("span");
  label.textContent = chapter.label;
  const time = document.createElement("time");
  const seconds = Math.floor(chapter.start);
  time.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  button.append(label, time);
  button.addEventListener("click", () => seek(index));
  button.addEventListener("keydown", (event) => {
    const target = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: chapters.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    buttons[Math.min(Math.max(target, 0), chapters.length - 1)].focus();
  });
  row.append(button);
  stops.append(row);
  buttons.push(button);

  const textRow = document.createElement("li");
  const jump = document.createElement("button");
  jump.type = "button";
  jump.textContent = `${time.textContent} · ${chapter.label}`;
  jump.addEventListener("click", () => {
    seek(index);
    video.focus();
  });
  const paragraph = document.createElement("p");
  const [first, second] = chapter.lines.map(line => line.replace("M C P", "MCP"));
  paragraph.textContent = `${first} ${second}`;
  textRow.append(jump, paragraph);
  transcript.append(textRow);

  const cueStart = chapter.start + chapter.lead;
  const cueBreak = cueStart + chapter.break;
  captionTrack.addCue(new VTTCue(cueStart, cueBreak, first));
  captionTrack.addCue(new VTTCue(cueBreak, cueStart + chapter.speech, second));
}

function syncChapter() {
  setActive(chapters.findLastIndex(chapter => video.currentTime + 0.001 >= chapter.start));
}
video.addEventListener("timeupdate", syncChapter);
video.addEventListener("seeked", syncChapter);
syncChapter();
