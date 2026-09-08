# Follow reveals the world

The real writing screenshots exposed a usability gap: Follow changed the camera while Mission Command remained scrolled below the canvas. Enabling Follow now instantly scrolls the world into view. Disabling Follow and passive observations do not cause scrolling. The action does not create movement, change execution identity or alter runtime truth.

The bounded browser check uses a controlled snapshot of the retained real writing observations. It performs no source or model work. At 1280×600 and 320×600 with reduced motion enabled, it first asserts that the world is completely offscreen, focuses Follow without scrolling and presses Enter. The world then appears at the viewport top (−0.15625px and 0.34375px respectively), with the canvas in view. Selected identity and serialized runtime truth are unchanged, no horizontal overflow and no page errors. Both screenshots were captured after activation; the narrow screenshot was visually inspected.

The first 900px-high fixture could not scroll the entire world out of view and failed its precondition. The compact 600px fixture exercises the required offscreen case. An initial exact nonnegative-zero alignment check was too strict for fractional DOM layout; the final assertion allows less than two pixels and records the actual bounds. These harness adjustments do not weaken the requirement that the world was offscreen before activation and visible immediately afterward.

Typecheck and production build pass. This is a viewport interaction check, not a new real-travel proof or a visual-fidelity approval. Existing throughput, writing-quality and native-hidden qualifications remain incomplete; no soak was started.
