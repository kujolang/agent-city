# Saved Workcell setup

The explicit `setup:workcell --build --enable` command builds the existing pinned
image and saves its immutable ID and named Docker context for the selected runtime.
`--image LOCAL_IMAGE --enable` selects an existing trusted image without pulling it.
Normal City startup loads saved setup; explicit environment overrides remain authoritative.
Image-build receipts alone do not enable anything, and every mission still requires
its own execution opt-in. `--disable` takes effect on the next normal restart.

`proof.json` records an actual Docker/Colima image inspection and two normal City
launches with CITY_ENABLE_WORKCELL, CITY_WORKCELL_IMAGE and DOCKER_CONTEXT absent:
saved enabled setup was available; after disabling and restarting it was unavailable.
The runtime-specific setup command pointed to the same instance, both mission lists
stayed empty, and no provider/model/task was invoked. The owned launchers and dedicated
Colima were stopped; default Docker context was not changed.

Regression tests cover private atomic grants, explicit environment precedence,
per-task consent, build-receipt non-authority, unsafe metadata, corrupt/non-private/
symlinked settings and saved disable. Full verify passes114tests, types, boundaries,
map validation and build. Browser setup remains keyboard-operable and authenticated.
The expanded installed Linux CI uses `--build --enable` and consumes saved settings
for actual Workcell execution; its result is recorded separately when terminal.

CI37773200210 at054e6bc completes all5jobs:114tests, browser acceptance, four
installed platforms, and actual Linuxx64/ARM Workcell execution using the saved
immutable image/context. `ci*.json` preserve the terminal result.
