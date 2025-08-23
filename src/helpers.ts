import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
//
export const isObject = (input: any) =>
  typeof input === "object" && !Array.isArray(input) && input !== null;
export const isPlainObject = (input: any) =>
  isObject(input) && Object.keys(input).length === 0;
export const isPlainArray = (input: any) =>
  Array.isArray(input) && input.length === 0;
export const wait = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time));
/**
 * Remove all files in the given directory.
 * @param dir The directory to clean.
 */
export const cleanDir = async (dir: string) => {
  const files = await fs.readdir(dir);
  await Promise.all(files.map((file) => fs.unlink(path.join(dir, file))));
};

/**
 * Recursively and forcefully removes a directory and all its contents.
 * @param {string} dirPath - The path to the directory to remove.
 */
export async function forceRemoveDir(dirPath: string) {
  if (!existsSync(dirPath)) return;
  for (const entry of await fs.readdir(dirPath)) {
    const fullPath = path.join(dirPath, entry);
    const stat = await fs.lstat(fullPath);
    if (stat.isDirectory()) {
      await forceRemoveDir(fullPath);
    } else {
      await fs.unlink(fullPath);
    }
  }
  await fs.rmdir(dirPath);
}

export const createOrCleanOutDir = async (dir: string) => {
  if (!existsSync(dir)) {
    await fs.mkdir(dir);
  } else {
    cleanDir(dir);
  }
};

const packageJsonFile = path.join(process.cwd(), "package.json");

/**
 * Retrieves the package data from the package.json file.
 *
 * An object containing the module type and the package data.
 * The module type is either "commonjs" or "module".
 * The package data is the parsed content of the package.json file.
 */
export async function getPackageData() {
  const packageDataString = await fs.readFile(packageJsonFile, "utf8");
  const packageData = JSON.parse(packageDataString);
  const moduleType: "commonjs" | "module" = packageData.type
    ? packageData.type
    : "commonjs";
  const version = packageData.version;
  const license = packageData.license;
  return {
    moduleType,
    packageData,
    version,
    license,
  };
}
