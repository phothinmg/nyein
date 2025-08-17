import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { green, italic, magenta } from "@lwe8/tcolor";
import ts from "typescript";
import bundle from "./bundle.js";
import checks from "./check/index.js";
import getConfig from "./config.js";
import { cleanDir, forceRemoveDir, wait } from "./opt/helpers.js";

export interface NpmCompileOptions {
	entry: string;
	outDir: string;
	module: ts.ModuleKind;
	format: "esm" | "cjs";
	dtsFile: string[];
	outFile: string[];
	tsConfigPath?: string;
}

const packageJsonFile = path.join(process.cwd(), "package.json");

/**
 * Retrieves the package data from the package.json file.
 *
 * An object containing the module type and the package data.
 * The module type is either "commonjs" or "module".
 * The package data is the parsed content of the package.json file.
 */
async function getPackageData() {
	const packageDataString = await fs.readFile(packageJsonFile, "utf8");
	const packageData = JSON.parse(packageDataString);
	const moduleType: "commonjs" | "module" = packageData.type
		? packageData.type
		: "commonjs";
	return {
		moduleType,
		packageData,
	};
}

/**
 * Replaces the extension of a file name based on the specified format.
 *
 * @param {string} fileName - The file name to replace the extension of.
 * @param {"esm" | "cjs"} format - The format to replace the extension with.
 * @return {Promise<string>} The file name with the extension replaced based on the format.
 */
async function replaceExt(
	fileName: string,
	format: "esm" | "cjs",
): Promise<string> {
	let baseName = path.basename(fileName);
	const dirName = path.dirname(fileName);
	const { moduleType } = await getPackageData();
	switch (format) {
		case "esm":
			baseName =
				moduleType === "commonjs"
					? baseName.replace(/.ts/, ".mts").replace(/.js/, ".mjs")
					: baseName;

			break;
		case "cjs":
			baseName =
				moduleType === "module"
					? baseName.replace(/.ts/, ".cts").replace(/.js/, ".cjs")
					: baseName;
			break;
	}
	return path.join(dirName, baseName);
}

/**
 * Compiles the specified entry file and outputs the bundled code to the specified directory.
 *
 * @param {NpmCompileOptions} options - The options for compiling the entry file.
 * @param {string} options.entry - The path to the entry file.
 * @param {string} options.outDir - The output directory for the compiled code.
 * @param {ts.ModuleKind} options.module - The module kind for the compiled code.
 * @param {"esm" | "cjs"} options.format - The format for the compiled code.
 * @param {string[]} options.dtsFile - An array to store the names of generated d.ts files.
 * @param {string[]} options.outFile - An array to store the names of generated output files.
 * @param {string | undefined} options.tsConfigPath - The path to a custom tsconfig file.
 * @return {Promise<void>} A promise that resolves when the compiling is complete.
 */
async function _compile({
	entry,
	outDir,
	module,
	format,
	dtsFile,
	outFile,
	tsConfigPath = undefined,
}: NpmCompileOptions): Promise<void> {
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
		outName = await replaceExt(outName, format);
		if (existsSync(outName)) {
			await fs.unlink(outName);
		}
		const dir = path.dirname(outName);
		if (!existsSync(dir)) {
			await fs.mkdir(dir, { recursive: true });
		}

		const file_name = path.basename(outName);
		if (
			/.d.ts/g.test(file_name) ||
			/.d.cts/g.test(file_name) ||
			/.d.mts/g.test(file_name)
		) {
			dtsFile.push(file_name);
		} else {
			outFile.push(file_name);
		}
		await wait(500);
		await fs.writeFile(outName, content);
	});
}
//-------
const esmPackageJsonTxt = `
{
  "type":"module"
}
`;
const cjsPackageJsonTxt = `
{
  "type":"commonjs"
}
`;
type _Exports = Record<
	string,
	{
		import: { types: string; default: string };
		require: { types: string; default: string };
	}
>;
/**
 * Writes the given exports object to the package.json file.
 * @param _exports An object containing the exports to be written.
 * @returns A Promise that resolves when the file has been written.
 */
async function writePackageJson(_exports: _Exports) {
	const { packageData } = await getPackageData();
	const { main, exports, ...rest } = packageData;
	const __$main = main;
	const __$exports = exports;
	const data = { ...rest, exports: _exports };
	await fs.writeFile(packageJsonFile, JSON.stringify(data, null, 2));
}

/**
 * Compiles the current package as a NodeJS module.
 *
 * This function reads the configuration specified in the `nyein.config.ts`
 * file and uses it to compile the package to a NodeJS module. The compiled
 * module is written to the `dist` directory, with separate `esm` and `commonjs`
 * directories for each exported module.
 *
 * @return {Promise<void>} A Promise that resolves when the compilation is complete.
 */
async function compileNPM(): Promise<void> {
	console.info(green("Start compiling to publish npm package."));
	console.time(green("Compile time"));
	// nyein config
	const root = process.cwd();
	const config = await getConfig();
	if (!config.npm) {
		console.error(
			italic(magenta("To compile npm module `config.npm` required")),
		);
		process.exit(1);
	}
	if (!config.npm?.exports.main) {
		console.error(
			italic(
				magenta(
					"To compile npm module `config.npm` and `config.npm.exports.main` required",
				),
			),
		);
		process.exit(1);
	}
	const exportsObj = config.npm.exports;
	let out_dir = config.npm?.outDir ?? "dist";
	if (out_dir.startsWith("./")) {
		out_dir = out_dir.slice(2).trim();
	}
	let tsconfig_path = config.npm?.tsconfig ?? undefined;
	if (tsconfig_path) {
		tsconfig_path = path.join(root, tsconfig_path);
	}
	const exportKeys = Object.keys(exportsObj);
	// bundle
	const temp_dir = "._nyein";
	let esmOutDir = "";
	let cjsOutDir = "";
	let path_to_remove = "";
	const _exports: _Exports = {};
	for await (const key of exportKeys) {
		const cjsDtsFile: string[] = [];
		const cjsOutFile: string[] = [];
		const esmDtsFile: string[] = [];
		const esmOutFile: string[] = [];
		const _entry = exportsObj[key as any];
		if (key === "main") {
			esmOutDir = path.join(root, out_dir, "esm");
			cjsOutDir = path.join(root, out_dir, "commonjs");
		} else {
			esmOutDir = path.join(root, out_dir, key, "esm");
			cjsOutDir = path.join(root, out_dir, key, "commonjs");
		}
		if (existsSync(esmOutDir)) {
			await cleanDir(esmOutDir);
			await wait(500);
		}
		if (existsSync(cjsOutDir)) {
			await cleanDir(cjsOutDir);
			await wait(500);
		}

		const _bundle = await bundle({
			entry: _entry,
			outDir: temp_dir,
			check: true,
			exit: true,
			write: true,
			timeLog: false,
		});
		path_to_remove = path.dirname(_bundle.out_file);
		await wait(1000);
		await _compile({
			entry: _bundle.out_file,
			outDir: cjsOutDir,
			module: ts.ModuleKind.CommonJS,
			format: "cjs",
			dtsFile: cjsDtsFile,
			outFile: cjsOutFile,
			tsConfigPath: tsconfig_path,
		});
		await wait(1000);
		const cjs_package_json_path = path.join(cjsOutDir, "package.json");
		await fs.writeFile(cjs_package_json_path, cjsPackageJsonTxt);
		await wait(1000);
		await _compile({
			entry: _bundle.out_file,
			outDir: esmOutDir,
			module: ts.ModuleKind.ES2020,
			format: "esm",
			dtsFile: esmDtsFile,
			outFile: esmOutFile,
			tsConfigPath: tsconfig_path,
		});
		await wait(1000);
		const esm_package_json_path = path.join(esmOutDir, "package.json");
		await fs.writeFile(esm_package_json_path, esmPackageJsonTxt);
		if (key === "main") {
			_exports["."] = {
				import: {
					types: `./${out_dir}/esm/${esmDtsFile.join("").trim()}`,
					default: `./${out_dir}/esm/${esmOutFile.join("").trim()}`,
				},
				require: {
					types: `./${out_dir}/commonjs/${cjsDtsFile.join("").trim()}`,
					default: `./${out_dir}/commonjs/${cjsOutFile.join("").trim()}`,
				},
			};
		} else {
			_exports[key] = {
				import: {
					types: `./${out_dir}/${key.slice(2).trim()}/esm/${esmDtsFile
						.join("")
						.trim()}`,
					default: `./${out_dir}/${key.slice(2).trim()}/esm/${esmOutFile
						.join("")
						.trim()}`,
				},
				require: {
					types: `./${out_dir}/${key.slice(2).trim()}/commonjs/${cjsDtsFile
						.join("")
						.trim()}`,
					default: `./${out_dir}/${key.slice(2).trim()}/commonjs/${cjsOutFile
						.join("")
						.trim()}`,
				},
			};
		}
	} // loop end
	await writePackageJson(_exports);
	await wait(500);
	await forceRemoveDir(path_to_remove);
	console.timeEnd(green("Compile time"));
}

export default compileNPM;
