import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { compileNpm } from "./src/index.js";
import { forceRemoveDir, wait } from "./src/helpers.js";

if (existsSync("./dist")) {
  await forceRemoveDir("./dist");
}

const fns = [
  compileNpm,
  async function () {
    const content = await fs.readFile("./src/nyein.js");
    await wait(1000);
    await fs.writeFile("./dist/nyein.js", content);
  },
  async function () {
    await fs.chmod("./dist/nyein.js", 0o755);
  },
];

for await (const fn of fns) {
  await fn();
}
