export declare const isObject: (input: any) => boolean;
export declare const isPlainObject: (input: any) => boolean;
export declare const isPlainArray: (input: any) => boolean;
export declare const wait: (time: number) => Promise<unknown>;
/**
 * Remove all files in the given directory.
 * @param dir The directory to clean.
 */
export declare const cleanDir: (dir: string) => Promise<void>;
/**
 * Recursively and forcefully removes a directory and all its contents.
 * @param {string} dirPath - The path to the directory to remove.
 */
export declare function forceRemoveDir(dirPath: string): Promise<void>;
export declare const createOrCleanOutDir: (dir: string) => Promise<void>;
