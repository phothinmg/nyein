import fs from "node:fs/promises";
import ts from "typescript";
import path from "node:path";
import { yellow, italic, green } from "@lwe8/tcolor";
import checks from "./check/index.js";
import getDependenciesInfo from "./opt/madge.js";
import { mergeTypescriptFile, removeImports } from "./opt/merge_file.js";
import {
  wait,
  isPlainObject,
  isPlainArray,
  createOrCleanOutDir,
} from "./opt/helpers.js";

export interface BundleOptions {
  /**
   * `path/to/entry_file`
   */
  entry: string;
  /**
   * Output directory
   */
  outDir: string;
  /**
   * Types check and check for duplicate declarations
   *
   * @default true
   */
  check?: boolean;
  /**
   * If `options.check` true , when error exit process or not.
   *
   * @default true
   */
  exit?: boolean;
  /**
   * Typescript compiler options or custom tsconfig path.
   *
   * Priority :
   *  - custom tsconfig path from options.compileOptsOrPath
   *  - tsconfig.json from project root
   *  - Typescript compiler options from options.compileOptsOrPath
   */
  compileOptsOrPath?: string | ts.CompilerOptions;
  write?: boolean;
  timeLog?: boolean;
}

export default async function bundle({
  entry,
  outDir,
  check = true,
  exit = true,
  compileOptsOrPath = undefined,
  write = false,
  timeLog = true,
}: BundleOptions) {
  if (timeLog) {
    console.time(green("bundle time"));
  }
  const root = process.cwd();
  const out_dir = path.join(root, outDir);
  const file_name = path.basename(entry);
  const out_file = path.join(out_dir, file_name);
  const { warn, circularGraph, daGraph } = await getDependenciesInfo(entry);
  await checks.checkFiles(daGraph);
  // check for types and duplicated declarations
  if (check) {
    checks.typeCheckFromFile({ filePaths: daGraph, exit, compileOptsOrPath });
    await wait(500);
    checks.checkDuplicateDeclarations({
      filePaths: daGraph,
      exit,
      compileOptsOrPath,
    });
  }
  //
  await wait(500);
  if (!isPlainArray(warn.skipped)) {
    console.warn(`${italic(yellow(warn.skipped.join(" ")))}`);
  }
  if (!isPlainObject(circularGraph)) {
    const keys = Object.keys(circularGraph);
    let strA = keys.map((key) => {
      const _sub = circularGraph[key].join(" - ");
      return `Circular dependency ${key} -> ${_sub}`.trimStart();
    });
    console.warn(`${italic(yellow(strA.join("\n")))}`);
  }
  await wait(500);
  const mainFilePath = daGraph.slice(-1).join("");
  const { npmImport, depsContent } = await mergeTypescriptFile(daGraph);
  let mainContent = await fs.readFile(mainFilePath, "utf8");
  mainContent = removeImports(mainContent, npmImport);
  const finalContent =
    npmImport.join("\n") + "\n" + depsContent.join("\n") + "\n" + mainContent;
  if (write) {
    await createOrCleanOutDir(out_dir);
    await wait(1000);
    await fs.writeFile(out_file, finalContent);
    if (timeLog) {
      console.timeEnd(green("bundle time"));
    }
  }

  return {
    out_file,
    finalContent,
  };
}
