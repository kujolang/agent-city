# Current viewport sizing — 2026-10-07

The world no longer reserves420px of browser height for DOM panels. It reserves
80px for its compact heading and uses the largest1x/2x/3x integer scale that fits
the column and remaining height. Window resize also recalculates the scale.
Detailed panels remain scrollable. Mission Command native selects are constrained
to their panel width, fixing a measured1px overflow at320px.

Current proof.json and screenshots cover320/768/1024/1280/1920px widths at600px
height. Canvas is256×240 on320px and512×480 elsewhere. Every case verifies the
entire canvas fits after keyboard Follow, world was offscreen beforehand, no
horizontal overflow, no page errors, and unchanged serialized truth/selection.
Reduced motion is enabled. Desktop and narrow screenshots visually inspected.
Typecheck and production build pass. Command: `npx tsx scripts/follow-viewport-proof.ts`.

The harness explicitly stops automatic Follow by inspecting City before testing
keyboard activation; it previously depended on completed-run timing and sometimes
toggled Follow off instead. A width-only prototype clipped the canvas on short
windows and was replaced before acceptance. No runtime semantics or source work
changed. This improves presentation size; it does not approve full reference
fidelity, browser certification or release readiness.

## Historical original Follow check

# Follow reveals the world

The real writing screenshots exposed a usability gap: Follow changed the camera while Mission Command remained scrolled below the canvas. Enabling Follow now instantly scrolls the world into view. Disabling Follow and passive observations do not cause scrolling. The action does not create movement, change execution identity or alter runtime truth.

The bounded browser check uses a controlled snapshot of the retained real writing observations. It performs no source or model work. At 1280×600 and 320×600 with reduced motion enabled, it first asserts that the world is completely offscreen, focuses Follow without scrolling and presses Enter. The world then appears at the viewport top (−0.15625px and 0.34375px respectively), with the canvas in view. Selected identity and serialized runtime truth are unchanged, no horizontal overflow and no page errors. Both screenshots were captured after activation; the narrow screenshot was visually inspected.

The first 900px-high fixture could not scroll the entire world out of view and failed its precondition. The compact 600px fixture exercises the required offscreen case. An initial exact nonnegative-zero alignment check was too strict for fractional DOM layout; the final assertion allows less than two pixels and records the actual bounds. These harness adjustments do not weaken the requirement that the world was offscreen before activation and visible immediately afterward.

Typecheck and production build pass. This is a viewport interaction check, not a new real-travel proof or a visual-fidelity approval. Existing throughput, writing-quality and native-hidden qualifications remain incomplete; no soak was started.
