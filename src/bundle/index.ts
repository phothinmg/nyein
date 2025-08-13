import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { getModuleTypeFromDeps, checkFileExtension } from "./files-check.js";
import { mergeTypescriptFile, removeImports } from "./merge-file.js";
import getDependenciesInfo from "./madge.js";
import checkTypes from "../type_check.js";
import {
  wait,
  isPlainObject,
  isPlainArray,
  cleanDir,
  forceRemoveDir,
} from "../helpers.js";
import { magenta, yellow, italic, green } from "../tcolor.js";
import { exec } from "child_process";

const root = process.cwd();
const temp_dir = path.join(root, "._nyein");

function checkTypesInChild(file: string, ts_config?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = ts_config
      ? `node -e "require('./type_check.js').default(['${file}'], '${ts_config}')"`
      : `node -e "require('./type_check.js').default(['${file}'])"`;
    exec(cmd, (error) => {
      resolve(!error); // true if success, false if error
    });
  });
}

const createTempDir = async () => {
  if (!existsSync(temp_dir)) {
    await fs.mkdir(temp_dir);
  } else {
    cleanDir(temp_dir);
  }
};

const bundle = async (entry: string, ts_config?: string) => {
  console.time(italic(green("bundle time")));
  const file_name = path.basename(entry);
  await createTempDir();
  const out_file = path.join(temp_dir, file_name);
  const { warn, circularGraph, daGraph } = await getDependenciesInfo(entry);
  await wait(500);
  if (!isPlainArray(warn.skipped)) {
    console.warn(`${italic(yellow(warn.skipped.join(" ")))}`);
  }
  if (!isPlainObject(circularGraph)) {
    const keys = Object.keys(circularGraph);
    let strA = keys.map((key) => {
      const _sub = circularGraph[key].join(" - ");
      return `Circular dependency ${key} ==> ${_sub}`.trimStart();
    });
    console.warn(`${italic(yellow(strA.join("\n")))}`);
  }
  const ext_type = await checkFileExtension(daGraph);
  const module_type = await getModuleTypeFromDeps(daGraph);
  await wait(500);
  if (ext_type !== "both" && module_type === "esm") {
    checkTypes({ filePaths: daGraph, configPath: ts_config, isExit: true });
    await wait(1000);
    const mainFilePath = daGraph.slice(-1).join("");
    await wait(500);
    const mfpOk = checkTypesInChild(mainFilePath, ts_config);
    checkTypes({
      filePaths: [mainFilePath],
      configPath: ts_config,
      isExit: true,
    });
    const { npmImport, depsContent } = await mergeTypescriptFile(daGraph);
    let mainContent = await fs.readFile(mainFilePath, "utf8");
    mainContent = removeImports(mainContent, npmImport);
    const finalContent =
      npmImport.join("\n") + "\n" + depsContent.join("\n") + "\n" + mainContent;
    await wait(500);
    await fs.writeFile(out_file, finalContent);
    await wait(1500);
    if (existsSync(out_file)) {
      const ok = await checkTypesInChild(out_file, ts_config);
      if (!ok) {
        console.error(`${italic(magenta("Error after bundled"))}`);
        await forceRemoveDir(temp_dir);
        process.exit(1);
      }
    }
  }
  console.timeEnd(italic(green("bundle time")));
};

export default bundle;
