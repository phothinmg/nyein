import fs from "node:fs/promises";
import { wait } from "./helpers.js";
/**
 * Removes import statements from the given code string and collects any non-relative imports
 * into the provided npm array.
 *
 * @param {string} code - The source code string from which to remove import statements.
 * @param {string[]} npm - An array to collect non-relative import statements.
 * @returns {string} - The modified code string with import statements removed and empty lines cleared.
 */

export function removeImports(code: string, npm: string[]): string {
	const importRegex = /^import[\s\S]+?from\s*['"]([^'"]+)['"]\s*;?/gm;
	const newCode = code.replace(importRegex, (match: string, path: string) => {
		if (!path.startsWith("./") && !path.startsWith("../")) {
			npm.push(match);
		}
		return "";
	});
	return newCode.replace(/^\s*[\r\n]/gm, ""); // Remove empty lines left by imports
}

/**
 * Removes export statements from the given code string.
 *
 * The following types of export statements are removed:
 * - export type { ... } and export { ... } blocks (multi-line)
 * - export or export default followed by const/function/type/interface (keep the declaration)
 * - All other export/export default statements (whole line)
 *
 * @param {string} code - The source code string from which to remove export statements.
 * @returns {string} - The modified code string with export statements removed and empty lines cleared.
 */
function removeExports(code: string): string {
	// Remove export type { ... } and export { ... } blocks (multi-line)
	code = code.replace(/^export\s+(type\s+)?\{[\s\S]*?\};?/gm, "");
	// Remove export or export default followed by const/function/type/interface (keep the declaration)
	code = code.replace(
		/^export\s+(default\s+)?(async|const|function|type|interface)\b/gm,
		"$2",
	);
	// Remove all other export/export default statements (whole line)
	code = code.replace(/^export\s+.*;?\s*$/gm, "");
	return code.replace(/^\s*[\r\n]/gm, ""); // Remove empty lines
}

async function mergeTypescriptFile(dag: string[]) {
	const npmImport: string[] = [];
	const depsContent: string[] = [];
	const depsFiles = dag.slice(0, -1);
	for await (const file of depsFiles) {
		let content = await fs.readFile(file, "utf8");
		content = removeImports(content, npmImport);
		content = removeExports(content);
		depsContent.push(content);
	}
	await wait(1000);
	return {
		npmImport,
		depsContent,
	};
}

export { mergeTypescriptFile };
