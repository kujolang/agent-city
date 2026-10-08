# VideoOps human review browser contract

Controlled DOM/API fixture only. No human actually approved or rejected the test
video and no source operation ran. The fixture uses a real technical-test MP4
solely as player content. Playwright verifies pending/perceptual status, keyboard
submission, explicit human attestation, exact candidate checksum in the submitted
request, and display of the mocked failed-review response. `proof.json` and
`review.png` retain the bounded result. Actual native review/render qualification
is separately recorded under `../videoops-render/37792840086`.

The controlled proof also mounts the production launch form: disabled without
operator setup, enabled by the fixture readiness callback, keyboard submission,
explicit per-task render consent and intact prompt/geometry in the outgoing request.
No real production task is submitted by this browser contract test.

Finalization coverage uses explicitly mocked review/approval responses. It verifies
that failed review hides the finalize action, mocked approval enables it, an explicit
keyboard action submits the exact candidate checksum, and the confirmed final download
appears. This is not evidence of a real human review, real native promotion, or a
completed live production.
