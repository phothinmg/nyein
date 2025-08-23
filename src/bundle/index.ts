import fs from "node:fs/promises";
import path from "node:path";
import { italic, yellow } from "@lwe8/tcolor";
import $fnCompilerOptions from "../compiler_options.js";
import {
	createOrCleanOutDir,
	isPlainArray,
	isPlainObject,
} from "../helpers.js";
import checkDuplicate from "./check_duplicate.js";
import checkFileExtensionAndFormat from "./check_files.js";
import { $getDependenciesConent } from "./getDepsContents.js";
import merge from "./merge.js";
export interface BundleOptions {
	entry: string;
	outDir: string;
	customConfigPath?: string | undefined;
	allowBanner?: boolean;
}

async function bundle({
	entry,
	outDir,
	customConfigPath = undefined,
	allowBanner = true,
}: BundleOptions) {
	console.time("bundled time");
	const out_file_name = path.basename(entry);
	const out_dir = path.join(process.cwd(), outDir);
	const out_file_path = path.join(out_dir, out_file_name);
	const compilerOptions = $fnCompilerOptions.get(customConfigPath);
	const { dependenciesConent, warn, circularGraph } =
		await $getDependenciesConent(entry);
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
		async () => checkFileExtensionAndFormat(dependenciesConent),
		async () => await checkDuplicate(dependenciesConent, compilerOptions),
		async () => {
			content = await merge(dependenciesConent, compilerOptions, allowBanner);
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
		out_file_path,
	};
}

export default bundle;
