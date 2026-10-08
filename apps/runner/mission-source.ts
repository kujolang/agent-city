/** Shared with every mission adapter; gateway scope must match producer identity. */
export function missionSource(id: string, sourcePrefix?: string) {
  return (sourcePrefix || "review-") + id;
}
