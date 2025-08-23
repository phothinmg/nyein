import fs from "node:fs/promises";
import path from "node:path";
import getDependenciesInfo from "./madge.js";

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

export async function $getDependenciesConent(entry: string) {
	const { warn, circularGraph, daGraph } = await getDependenciesInfo(entry);
	const dependenciesConent: DependenciesContents[] = [];
	for await (const file of daGraph) {
		const content = await fs.readFile(file, "utf8");
		const filePath = $rootSlice(file);
		dependenciesConent.push({ filePath, file, content });
	}
	return { dependenciesConent, warn, circularGraph };
}
