import fs from "node:fs/promises";
import ts from "typescript";
import { existsSync } from "node:fs";
import path from "node:path";
import { getModuleTypeFromDeps, checkFileExtension } from "./files-check.js";
import { mergeTypescriptFile, removeImports } from "./merge-file.js";
import getDependenciesInfo from "./madge.js";
import { typeCheckFromFile } from "./type_check.js";
import { wait, isPlainObject, isPlainArray, cleanDir } from "./helpers.js";
import { magenta, yellow, italic } from "@lwe8/tcolor";

export interface BundleOptions {
  entry: string;
  customTsConfig?: string;
  check?: boolean;
  exit?: boolean;
  compilerOptions?: ts.CompilerOptions;
}

const root = process.cwd();
export const temp_dir = path.join(root, "._nyein");

const createTempDir = async () => {
  if (!existsSync(temp_dir)) {
    await fs.mkdir(temp_dir);
  } else {
    cleanDir(temp_dir);
  }
};

/**
 * Bundles a single Typescript file with all its dependencies into one file.
 */
const bundle = async ({
  entry,
  customTsConfig = undefined,
  check = true,
  exit = true,
  compilerOptions = undefined,
}: BundleOptions) => {
  const file_name = path.basename(entry);
  await createTempDir();
  const out_file = path.join(temp_dir, file_name);
  const { warn, circularGraph, daGraph } = await getDependenciesInfo(entry);
  const ext_type = await checkFileExtension(daGraph);
  const module_type = await getModuleTypeFromDeps(daGraph);
  await wait(500);
  if (ext_type === "both") {
    console.warn(
      italic(
        magenta(
          "Both Javascript and Typescript extensions found in dependencies tree, currently unsupported."
        )
      )
    );
    process.exit(1);
  }
  if (module_type === "commonjs" || module_type === "mixed") {
    console.warn(
      italic(
        magenta(
          "Bundler found commonjs in dependencies tree,commonjs is currently unsupported."
        )
      )
    );
    process.exit(1);
  }
  await wait(500);
  if (!isPlainArray(warn.skipped)) {
    console.warn(`${italic(yellow(warn.skipped.join(" ")))}`);
  }
  if (!isPlainObject(circularGraph)) {
    const keys = Object.keys(circularGraph);
    let strA = keys.map((key) => {
      const _sub = circularGraph[key].join(" - ");
      return `Circular dependency ${key} ---> ${_sub}`.trimStart();
    });
    console.warn(`${italic(yellow(strA.join("\n")))}`);
  }
  if (check) {
    typeCheckFromFile({
      filePaths: daGraph,
      configPath: customTsConfig,
      isExit: exit,
      options: compilerOptions,
    });
  }

  await wait(1000);
  const mainFilePath = daGraph.slice(-1).join("");
  await wait(500);
  if (check) {
    typeCheckFromFile({
      filePaths: [mainFilePath],
      configPath: customTsConfig,
      isExit: exit,
      options: compilerOptions,
    });
  }

  const { npmImport, depsContent } = await mergeTypescriptFile(daGraph);
  let mainContent = await fs.readFile(mainFilePath, "utf8");
  mainContent = removeImports(mainContent, npmImport);
  const finalContent =
    npmImport.join("\n") + "\n" + depsContent.join("\n") + "\n" + mainContent;
  await wait(500);
  await fs.writeFile(out_file, finalContent);
  if (existsSync(out_file) && check) {
    typeCheckFromFile({
      filePaths: [out_file],
      configPath: customTsConfig,
      isExit: exit,
      options: compilerOptions,
    });
  }
  return {
    out_file,
  };
};

export default bundle;
