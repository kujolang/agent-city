import type { CityEvent } from "../../packages/protocol";
/** Playback uses observed order and clamped recorded observation gaps, never source calls.
 * Long gaps collapse to 2s for watchability; occurrence timestamps remain untouched. */
export function replaySchedule(events: readonly CityEvent[]): number[] {
  let tick = 0;
  return events.map((event, i) => {
    if (i)
      tick += Math.min(
        40,
        Math.max(
          1,
          Math.ceil((event.observedAt - events[i - 1].observedAt) / 50),
        ),
      );
    return tick;
  });
}
