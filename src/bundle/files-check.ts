import fs from "node:fs/promises";
import path from "node:path";
import { magenta, yellow, italic } from "../tcolor.js";
import { wait } from "../helpers.js";
// only support esm
const js_exts = [".js", ".mjs"];
const ts_exts = [".ts", ".mts"];

const commonJsAssignedRegexp =
  /^\s*(?:const|let|var)?\s*[\w$]*\s*=\s*require\(['"]([^'"]+)['"]\).*;?\s*$/gm;
const commonJsUnAssignedRegexp = /^\s*require\(['"]([^'"]+)['"]\).*;?\s*$/gm;
const is_commonJs = (str: string) =>
  commonJsAssignedRegexp.test(str) || commonJsUnAssignedRegexp.test(str);

function checkExtGroup(exts: string[]): "js" | "ts" | "both" | "none" {
  const jsSet = new Set(js_exts);
  const tsSet = new Set(ts_exts);

  const allJs = exts.every((ext) => jsSet.has(ext));
  const allTs = exts.every((ext) => tsSet.has(ext));
  const allValid = exts.every((ext) => jsSet.has(ext) || tsSet.has(ext));

  if (allJs) return "js";
  if (allTs) return "ts";
  if (allValid) return "both";
  return "none";
}

const checkFileExtension = async (
  dag: string[]
): Promise<"js" | "ts" | "both"> => {
  const validExts = js_exts.concat(ts_exts);
  const vExts: string[] = [];
  const un_validExt: string[] = [];
  for await (const file of dag) {
    const ext = path.extname(file);
    if (validExts.includes(ext)) {
      vExts.push(ext);
    } else {
      un_validExt.push(ext);
    }
  }
  await wait(1000);
  if (un_validExt.length) {
    console.error(
      magenta(
        `Unsupported file extensions ${italic(
          yellow(un_validExt.join(" "))
        )} found in dependencies tree.`
      )
    );
    process.exit(1);
  }
  const group_type = checkExtGroup(vExts);
  if (group_type === "none") {
    console.error(italic(magenta("Bundle error , bug for fix")));
    process.exit(1);
  }
  return group_type;
};

const esmRegexp = /(^|\n)\s*import\s|(^|\n)\s*export\s/m;
const getModuleTypeFromDeps = async (
  dag: string[]
): Promise<"esm" | "commonjs" | "mixed"> => {
  let esmCount = 0;
  let cjsCount = 0;
  for await (const file of dag) {
    const content = await fs.readFile(file, "utf8");
    if (is_commonJs(content)) cjsCount++;
    if (esmRegexp.test(content)) esmCount++;
  }
  if (esmCount && !cjsCount) return "esm";
  if (!esmCount && cjsCount) return "commonjs";
  if (esmCount && cjsCount) return "mixed";
  return "esm";
};

export { getModuleTypeFromDeps, checkFileExtension };
