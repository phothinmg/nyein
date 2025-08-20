import path from "node:path";
import { magenta } from "@lwe8/tcolor";
import { checkModuleFormatFromFile } from "./checkModuleFormat.js";

const $1wait = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time));
function checkExtGroupFromFile(file: string): "js" | "ts" | "none" {
  const extension = path.extname(file);
  const jsSet = new Set([".js", ".mjs", ".cjs", ".jsx"]);
  const tsSet = new Set([".ts", ".mts", ".cts", ".tsx"]);

  const Js = jsSet.has(extension);
  const Ts = tsSet.has(extension);

  if (Js) return "js";
  if (Ts) return "ts";
  return "none";
}

async function checkFiles(files: string[]) {
  let js_count = 0;
  let ts_count = 0;
  let esm_count = 0;
  let cjs_count = 0;
  for await (const file of files) {
    // check extension
    const checkExt = checkExtGroupFromFile(file);
    if (checkExt === "none") {
      console.error(
        magenta(`Bundler detects an unsupported file extension at ${file}`)
      );
      process.exit(1);
    }
    if (checkExt === "js") js_count++;
    if (checkExt === "ts") ts_count++;

    await $1wait(1000);
    // check module format
    const moduleFormat = await checkModuleFormatFromFile(file);
    if (typeof moduleFormat === "undefined") {
      console.error(magenta(`Error when checking module format of ${file}`));
      process.exit(1);
    }
    if (moduleFormat === "unknown") {
      console.error(
        magenta(`Bundler detects neither commonjs nor ESM format for ${file}`)
      );
      process.exit(1);
    }
    if (moduleFormat === "esm") esm_count++;
    if (moduleFormat === "commonjs") cjs_count++;
  }
  await $1wait(500);
  //TODO Extension Types: current version unsupported, try to support in future versions.
  if (js_count && ts_count) {
    console.warn(
      magenta(
        "Bundler detects both JavaScript and TypeScript extensions in the dependencies tree, which is currently unsupported but will be supported in future versions"
      )
    );
    process.exit(1);
  }
  //TODO Module Format: current version support only ESM format, try to support only CommonJs or Mixed ESM and CommonJs in future versions.
  await $1wait(500);
  if (cjs_count) {
    console.warn(
      magenta(
        "Bundler detects both ESM and CommonJs format(Mixed) or only CommonJs format in the dependencies tree, bundler currently support only ESM module format but will be supported in future versions."
      )
    );
    process.exit(1);
  }
  await $1wait(500);
  if (!esm_count) {
    console.warn(
      magenta(
        "Bundler detects any ESM module format in the dependencies tree, bundler currently support only ESM module format."
      )
    );
    process.exit(1);
  }
}

export default checkFiles;
