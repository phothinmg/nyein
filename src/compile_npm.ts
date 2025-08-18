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
	declaration: boolean;

	outFile: string[];
	dtsFile?: string[];
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
	declaration,
	tsConfigPath = undefined,
}: NpmCompileOptions): Promise<void> {
	const _compilerOptions = checks
		.getCompilerOptions()
		.forNpmCompile(outDir, module, declaration, tsConfigPath);
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
			dtsFile?.push(file_name);
		} else {
			outFile.push(file_name);
		}
		await wait(500);
		await fs.writeFile(outName, content);
	});
}
type _Exports = Record<
	string,
	{
		types: string;
		import: string;
		require: string;
		default?: string;
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

    const root = process.cwd();
    const config = await getConfig();

    if (!config.npm || !config.npm.exports?.main) {
        console.error(
            italic(
                magenta(
                    "To compile npm module, `config.npm` and `config.npm.exports.main` are required",
                ),
            ),
        );
        process.exit(1);
    }

    const exportsObj = config.npm.exports;
    let out_dir = config.npm.outDir?.replace(/^\.\//, "").trim() || "dist";
    let tsconfig_path = config.npm.tsconfig
        ? path.join(root, config.npm.tsconfig)
        : undefined;

    const temp_dir = "._nyein";
    const _exports: _Exports = {};

    // Pre-clean output dirs
    await Promise.all(
        Object.keys(exportsObj).map(async key => {
            const outDir =
                key === "main"
                    ? path.join(root, out_dir)
                    : path.join(root, out_dir, key);
            if (existsSync(outDir)) {
                await cleanDir(outDir);
            }
        }),
    );

    for (const key of Object.keys(exportsObj)) {
        const dtsFiles: string[] = [];
        const cjsOutFiles: string[] = [];
        const esmOutFiles: string[] = [];
        const _entry = exportsObj[key as any];
        const outDir =
            key === "main"
                ? path.join(root, out_dir)
                : path.join(root, out_dir, key);

        const _bundle = await bundle({
            entry: _entry,
            outDir: temp_dir,
            check: true,
            exit: true,
            write: true,
            timeLog: false,
        });
        const path_to_remove = path.dirname(_bundle.out_file);

        await Promise.all([
            _compile({
                entry: _bundle.out_file,
                outDir,
                module: ts.ModuleKind.CommonJS,
                format: "cjs",
                declaration: false,
                outFile: cjsOutFiles,
                tsConfigPath: tsconfig_path,
            }),
            _compile({
                entry: _bundle.out_file,
                outDir,
                module: ts.ModuleKind.ES2020,
                format: "esm",
                declaration: true,
                dtsFile: dtsFiles,
                outFile: esmOutFiles,
                tsConfigPath: tsconfig_path,
            }),
        ]);

        const typesPath =
            key === "main"
                ? `./${out_dir}/${dtsFiles.join("").trim()}`
                : `./${out_dir}/${key.slice(2).trim()}/${dtsFiles.join("").trim()}`;
        const importPath =
            key === "main"
                ? `./${out_dir}/${esmOutFiles.join("").trim()}`
                : `./${out_dir}/${key.slice(2).trim()}/${esmOutFiles.join("").trim()}`;
        const requirePath =
            key === "main"
                ? `./${out_dir}/${cjsOutFiles.join("").trim()}`
                : `./${out_dir}/${key.slice(2).trim()}/${cjsOutFiles.join("").trim()}`;

        _exports[key === "main" ? "." : key] = {
            types: typesPath,
            import: importPath,
            require: requirePath,
        };

        await forceRemoveDir(path_to_remove);
    }

    await writePackageJson(_exports);
    console.timeEnd(green("Compile time"));
}

export default compileNPM;
