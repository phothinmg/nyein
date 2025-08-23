import type ts from "typescript";
import nyeinBannerText from "../banner_text.js";
import { wait } from "../helpers.js";
import checkDuplicate from "./check_duplicate.js";
import checkFileExtensionAndFormat from "./check_files.js";
import type { DependenciesContents } from "./getDepsContents.js";
import { $removeEsmExports } from "./removeExports.js";
import { $removeEsmImports } from "./removeImport.js";
import mergeImports from "./mergeImports.js";

export default async function merge(
  deps: DependenciesContents[],
  compilerOptions: Partial<ts.CompilerOptions>,
  allowBanner = true
) {
  console.time("merged files");
  const checkFileAndModule = checkFileExtensionAndFormat(deps);
  if (!checkFileAndModule) {
    process.exit(1);
  }
  await checkDuplicate(deps, compilerOptions);
  await wait(100);
  const removedImports = $removeEsmImports(deps, compilerOptions);
  const removedExports = $removeEsmExports(removedImports, compilerOptions);
  let module_exports: string[] = [];
  const contentArray: string[] = [];
  for await (const f of removedExports) {
    if (f.moduleStatements.length) {
      f.moduleStatements.forEach((v) => module_exports.push(v));
    }
    if (f.removeExportsContent) {
      contentArray.push(f.removeExportsContent);
    } else {
      contentArray.push(f.removedImportsContent);
    }
  } // loop
  const banner_text = allowBanner ? nyeinBannerText : "";
  module_exports = mergeImports(module_exports);
  console.timeEnd("merged files");
  return `${banner_text}\n${module_exports.join("\n")}\n${contentArray.join(
    "\n"
  )}\n`.trim();
}
