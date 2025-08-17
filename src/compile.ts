import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
//
import checks from "./check/index.js";

//

// const packageJsonFile = path.join(process.cwd(), "package.json");

// async function getPackageData() {
// 	const packageDataString = await fs.readFile(packageJsonFile, "utf8");
// 	const packageData = JSON.parse(packageDataString);
// 	const moduleType: string = packageData.type ? packageData.type : "commonjs";
// 	return {
// 		moduleType,
// 		packageData,
// 	};
// }
export interface CompileOptions {
	/**
	 * `path/to/entry_file`
	 */
	entry: string;
	/**
	 * Output directory
	 */
	outDir: string;
	module: ts.ModuleKind;
	tsConfigPath?: string;
}

export default async function compile({
	entry,
	outDir,
	module,
	tsConfigPath = undefined,
}: CompileOptions) {
	const _compilerOptions = checks
		.getCompilerOptions()
		.forNpmCompile(outDir, module, tsConfigPath);
	if (!_compilerOptions) {
		throw new Error("Error");
	}
	const files = [entry];
	const createdFiles: Record<string, string> = {};
	const host = ts.createCompilerHost(_compilerOptions);
	host.writeFile = (fileName, contents) => {
		createdFiles[fileName] = contents;
	};
	var program = ts.createProgram(files, _compilerOptions, host);
	program.emit();
	Object.entries(createdFiles).map(async ([outName, content]) => {
		if (existsSync(outName)) {
			await fs.unlink(outName);
		}
		const dir = path.dirname(outName);
		if (!existsSync(dir)) {
			await fs.mkdir(dir, { recursive: true });
		}
		await fs.writeFile(outName, content);
	});
}
