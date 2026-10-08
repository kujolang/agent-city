# Small tool brief: video production quote calculator

Create a self-contained Kujo program that a video producer can reuse to estimate
the price of a short clip. No filesystem, network, package or model calls belong
in the resulting program.

Expose reusable functions for the subtotal and the discounted total:

- Subtotal = duration in seconds × price per second + fixed editing fee.
- Total = subtotal − discount.
- This small version accepts nonnegative numeric inputs and assumes the discount
  does not exceed the subtotal. Document this input contract; do not claim input
  validation unless you implement and test it.
- Demonstrate three quotes and print only their numeric totals, one per line:
  1. 30 seconds, rate 3, fee 25, discount 15 → 100.
  2. 0 seconds, rate 3, fee 25, discount 0 → 25.
  3. 60 seconds, rate 2, fee 10, discount 0 → 130.
- Use valid Kujo syntax grounded in the enabled documentation. Keep the source
  short and readable so a person can change inputs and reuse the functions.
- The separate reviewer must check both formulas, all three cases and the input
  contract, and return the corrected artifact. Review comments are model opinion;
  only the subsequent actual execution/checker can establish test outcomes.

The expected output is exactly `100\n25\n130\n` (the escape notation here denotes
three newline-terminated lines, not literal backslashes).
