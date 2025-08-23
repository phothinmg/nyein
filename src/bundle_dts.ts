import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import nyeinBannerText from "./banner_text.js";
import bundle, { type BundleOptions } from "./bundle/index.js";
import $fnCompilerOptions from "./compiler_options.js";
import { forceRemoveDir } from "./helpers.js";

//
export interface BundleDtsOptions extends BundleOptions {}

async function bundleDts({
	entry,
	outDir,
	customConfigPath = undefined,
	allowBanner = true,
}: BundleDtsOptions) {
	console.time("bundled dts time");
	const compilerOptions = $fnCompilerOptions.dts(outDir, customConfigPath);
	const temp_out_dir = "._nyein";
	const out_dir_to_remove = path.join(process.cwd(), temp_out_dir);
	const _bundle = await bundle({
		entry,
		outDir: temp_out_dir,
		allowBanner,
	});

	const opts = [
		async () => await _bundle.write(),
		async () => {
			const files = [_bundle.out_file_path];
			const createdFiles: Record<string, string> = {};
			const host = ts.createCompilerHost(compilerOptions);
			host.writeFile = (fileName, contents) => {
				fileName = fileName.replace(/.js/, ".d.ts");
				fileName = fileName.replace(/.mjs/, ".d.mts");
				createdFiles[fileName] = contents;
			};
			const program = ts.createProgram(files, compilerOptions, host);
			program.emit();
			Object.entries(createdFiles).map(async ([outName, content]) => {
				if (existsSync(outName)) {
					await fs.unlink(outName);
				}
				const dir = path.dirname(outName);
				if (!existsSync(dir)) {
					await fs.mkdir(dir, { recursive: true });
				}
				if (allowBanner) {
					content = `${nyeinBannerText}\n${content}\n`;
				}
				//console.log(outName);
				await fs.writeFile(outName, content);
			});
		},
		async () => {
			await forceRemoveDir(out_dir_to_remove);
		},
	];
	for await (const opt of opts) {
		await opt();
	}
	console.timeEnd("bundled dts time");
}

export default bundleDts;
