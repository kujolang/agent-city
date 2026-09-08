import { compileFromFile } from "json-schema-to-typescript";
import { writeFile } from "node:fs/promises";
await writeFile(
  "packages/protocol/generated.ts",
  await compileFromFile("packages/protocol/event.schema.json", {
    bannerComment:
      "/* Generated from event.schema.json. Run npm run generate. */",
  }),
);
