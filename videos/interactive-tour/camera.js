window.buildCityStop = function buildCityStop(id, duration, focusX, focusY) {
  const street = document.getElementById(`${id}-street`);
  const interior = document.getElementById(`${id}-interior`);
  const editorial = document.getElementById(`${id}-editorial`);
  const focus = `${focusX}% ${focusY}%`;
  const cameraEase = Motion.cubicBezier(0.62, 0, 0.24, 1);
  const settleEase = Motion.cubicBezier(0.22, 0.83, 0.29, 1);
  const timeline = gsap.timeline({ paused: true });

  if (interior) {
    const isArchive = id === "stop-archive";
    timeline.set(street, { transformOrigin: focus }, 0);
    timeline.fromTo(street, { scale: 1 }, { scale: isArchive ? 1.24 : 2.8, duration: 1.02, ease: cameraEase }, 0);
    timeline.fromTo(interior, { opacity: 0, scale: isArchive ? 1.12 : 1.24 },
      { opacity: 1, scale: 1, duration: 0.67, ease: settleEase }, 0.42);
    timeline.fromTo(editorial, { opacity: 0, x: 28 },
      { opacity: 1, x: 0, duration: 0.54, ease: settleEase }, 0.25);
    if (!isArchive) {
      timeline.to(interior, { opacity: 0, scale: 1.15, duration: 0.58, ease: cameraEase }, duration - 0.79);
      timeline.to(street, { scale: 1, duration: 0.76, ease: cameraEase }, duration - 0.78);
    }
  } else {
    timeline.to(street, { scale: 1.055, duration: 4.8, ease: settleEase }, 0);
    timeline.to(street, { scale: 1, duration: 1.15, ease: cameraEase }, duration - 1.18);
  }

  window.__timelines ??= {};
  window.__timelines[id] = timeline;
};
