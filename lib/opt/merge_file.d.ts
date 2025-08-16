/**
 * Removes import statements from the given code string and collects any non-relative imports
 * into the provided npm array.
 *
 * @param {string} code - The source code string from which to remove import statements.
 * @param {string[]} npm - An array to collect non-relative import statements.
 * @returns {string} - The modified code string with import statements removed and empty lines cleared.
 */
export declare function removeImports(code: string, npm: string[]): string;
declare function mergeTypescriptFile(dag: string[]): Promise<{
    npmImport: string[];
    depsContent: string[];
}>;
export { mergeTypescriptFile };
