import { existsSync } from "node:fs";
import path from "node:path";
import { italic, magenta } from "@lwe8/tcolor";

interface Exports {
	main: string;
	[x: `./${string}`]: string;
}

export interface NyeinConfig {
	npm?: {
		exports: Exports;
		outDir?: string;
		tsconfig?: string;
	};
}

function getConfigPath() {
	const _p1 = path.join(process.cwd(), "nyein.config.ts");
	const _p2 = path.join(process.cwd(), "nyein.config.js");
	const _p3 = path.join(process.cwd(), "nyein.config.mjs");
	if (existsSync(_p1)) {
		return _p1;
	} else if (existsSync(_p2)) {
		return _p2;
	} else if (existsSync(_p3)) {
		return _p3;
	} else {
		return undefined;
	}
}
export default async function getConfig() {
	const configPath = getConfigPath();
	if (!configPath) {
		console.error(
			italic(
				magenta(
					"Could not find `nyein.config.ts`,`nyein.config.js` or `nyein.config.mjs` file at root of your project.",
				),
			),
		);
		process.exit(1);
	}
	const _config = await import(configPath);
	const config: NyeinConfig | undefined = _config.default;
	if (!config) {
		console.error(italic(magenta("No default export from config file")));
		process.exit(1);
	}
	return config;
}
