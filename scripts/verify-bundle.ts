import { resolve } from "node:path";
import { verifyBundle } from "./bundle-integrity";
console.log(
  JSON.stringify(await verifyBundle(resolve(import.meta.dirname, "../.."))),
);
