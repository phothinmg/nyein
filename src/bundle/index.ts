import fs from "node:fs/promises";
import path from "node:path";
import { italic, yellow } from "@lwe8/tcolor";
import checkDuplicate from "./check_duplicate.js";
import checkFiles from "./check_files.js";
import getDependenciesInfo from "./madge.js";
import processImportExportFromDAGTree from "./processImportExport.js";
import nyeinBannerText from "../banner_text.js";
import {
  isPlainArray,
  isPlainObject,
  createOrCleanOutDir,
} from "../helpers.js";

export interface BundleOptions {
  entry: string;
  outDir: string;
  customConfigPath?: string | undefined;
  renameDuplicated?: boolean;
  allowBanner?: boolean;
}

async function bundle({
  entry,
  outDir,
  customConfigPath = undefined,
  renameDuplicated = false,
  allowBanner = true,
}: BundleOptions) {
  console.time("bundled time");
  const out_file_name = path.basename(entry);
  const out_dir = path.join(process.cwd(), outDir);
  const out_file_path = path.join(out_dir, out_file_name);
  const { warn, circularGraph, daGraph } = await getDependenciesInfo(entry);
  if (!isPlainArray(warn.skipped)) {
    console.warn(`${italic(yellow(warn.skipped.join(" ")))}`);
  }
  if (!isPlainObject(circularGraph)) {
    const keys = Object.keys(circularGraph);
    const strA = keys.map((key) => {
      const _sub = circularGraph[key].join(" - ");
      return `Circular dependency ${key} -> ${_sub}`.trimStart();
    });
    console.warn(`${italic(yellow(strA.join("\n")))}`);
  }
  let content = "";
  const checks = [
    async function _files() {
      return await checkFiles(daGraph);
    },
    async function _duplicate() {
      return await checkDuplicate({
        filePaths: daGraph,
        customConfigPath,
        renameDuplicated,
      });
    },
    async function _content() {
      const c = await processImportExportFromDAGTree({
        dagTree: daGraph,
        customConfigPath,
        allowBanner,
        nyeinBannerText,
      });
      content = c;
    },
  ];
  for await (const check of checks) {
    await check();
  }
  const write = async () => {
    await createOrCleanOutDir(out_dir);
    await fs.writeFile(out_file_path, content);
  };
  console.timeEnd("bundled time");
  return {
    content,
    write,
  };
}

export default bundle;
