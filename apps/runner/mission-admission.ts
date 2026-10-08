/** Operator admission decision, never a source execution outcome. */
export interface AdmissionRelease {
  schema: "agent-city.admission-release.v1";
  missionId: string;
  acknowledgedPossibleOngoingWork: true;
  occurredAt: string;
}
export function admissionHeld(job: {
  id: string;
  status: string;
  admissionRelease?: AdmissionRelease;
}) {
  if (job.status !== "unknown") return false;
  const release = job.admissionRelease;
  return !(
    release?.schema === "agent-city.admission-release.v1" &&
    release.missionId === job.id &&
    release.acknowledgedPossibleOngoingWork === true &&
    typeof release.occurredAt === "string" &&
    Number.isFinite(Date.parse(release.occurredAt))
  );
}
export function releaseAdmission(
  job: { id: string; status: string },
  acknowledged: unknown,
  occurredAt: string,
): AdmissionRelease {
  if (
    job.status !== "unknown" ||
    acknowledged !== true ||
    !Number.isFinite(Date.parse(occurredAt))
  )
    throw Error(
      "Explicit acknowledgement of the unknown outcome and possible ongoing work is required",
    );
  return {
    schema: "agent-city.admission-release.v1",
    missionId: job.id,
    acknowledgedPossibleOngoingWork: true,
    occurredAt,
  };
}
