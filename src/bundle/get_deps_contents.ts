import fs from "node:fs/promises";
import path from "node:path";
import getDependenciesInfo from "./madge.js";
import { wait } from "../helpers.js";
import types_check from "./types_check.js";
import check_duplicate from "./check_declare.js";
export interface DependenciesContents {
  filePath: string;
  file: string;
  content: string;
}

export function $rootSlice(str: string, plusOne: boolean = true) {
  const rootLength = process.cwd().split(path.sep).length;
  const sliceLength = plusOne ? rootLength + 1 : rootLength;
  return str.split(path.sep).slice(sliceLength).join(path.sep);
}

export async function $getDependenciesContent(
  entry: string,
  check: boolean = true,
  customConfigPath: string | undefined = undefined
) {
  const { warn, circularGraph, daGraph } = await getDependenciesInfo(entry);
  await wait(500);
  await check_duplicate({ filePaths: daGraph, customConfigPath });
  if (check) {
    types_check({ filePaths: daGraph, customConfigPath });
  }
  await wait(1000);
  const dependenciesContent: DependenciesContents[] = [];
  for await (const file of daGraph) {
    const content = await fs.readFile(file, "utf8");
    const filePath = $rootSlice(file);
    dependenciesContent.push({ filePath, file, content });
  }
  return { dependenciesContent, warn, circularGraph };
}
