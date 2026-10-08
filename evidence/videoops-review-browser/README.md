# VideoOps human review browser contract

Controlled DOM/API fixture only. No human actually approved or rejected the test
video and no source operation ran. The fixture uses a real technical-test MP4
solely as player content. Playwright verifies pending/perceptual status, keyboard
submission, explicit human attestation, exact candidate checksum in the submitted
request, and display of the mocked failed-review response. `proof.json` and
`review.png` retain the bounded result. Actual native review/render qualification
is separately recorded under `../videoops-render/37792840086`.
