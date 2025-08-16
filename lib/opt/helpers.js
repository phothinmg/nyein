import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { exec } from "child_process";
//
export const isObject = (input) => typeof input === "object" && !Array.isArray(input) && input !== null;
export const isPlainObject = (input) => isObject(input) && Object.keys(input).length === 0;
export const isPlainArray = (input) => Array.isArray(input) && input.length === 0;
export const wait = (time) => new Promise((resolve) => setTimeout(resolve, time));
/**
 * Remove all files in the given directory.
 * @param dir The directory to clean.
 */
export const cleanDir = async (dir) => {
    const files = await fs.readdir(dir);
    await Promise.all(files.map((file) => fs.unlink(path.join(dir, file))));
};
/**
 * Recursively and forcefully removes a directory and all its contents.
 * @param {string} dirPath - The path to the directory to remove.
 */
export async function forceRemoveDir(dirPath) {
    if (!existsSync(dirPath))
        return;
    for (const entry of await fs.readdir(dirPath)) {
        const fullPath = path.join(dirPath, entry);
        const stat = await fs.lstat(fullPath);
        if (stat.isDirectory()) {
            await forceRemoveDir(fullPath);
        }
        else {
            await fs.unlink(fullPath);
        }
    }
    await fs.rmdir(dirPath);
}
function checkTypesInChild(file, ts_config) {
    return new Promise((resolve) => {
        const cmd = ts_config
            ? `node -e "require('./type_check.js').default(['${file}'], '${ts_config}')"`
            : `node -e "require('./type_check.js').default(['${file}'])"`;
        exec(cmd, (error) => {
            resolve(!error); // true if success, false if error
        });
    });
}
export const createOrCleanOutDir = async (dir) => {
    if (!existsSync(dir)) {
        await fs.mkdir(dir);
    }
    else {
        cleanDir(dir);
    }
};
