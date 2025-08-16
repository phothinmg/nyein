import fs from "node:fs/promises";
import ts from "typescript";
import path from "node:path";
import checks from "./check/index.js";
import bundle from "./bundle.js";
import { existsSync } from "node:fs";
import { forceRemoveDir } from "./opt/helpers.js";
export default async function bundleDts({ entry, outDir, check = true, exit = true, compileOptsOrPath = undefined, }) {
    const temp_dir = "._nyein";
    const _compilerOptions = checks
        .getCompilerOptions(compileOptsOrPath)
        .forBundleDts(outDir);
    const _bundle = await bundle({
        entry: entry,
        outDir: temp_dir,
        check,
        write: true,
        exit,
    });
    const out_dir_to_remove = path.dirname(_bundle.out_file);
    const files = [_bundle.out_file];
    const createdFiles = {};
    const host = ts.createCompilerHost(_compilerOptions);
    host.writeFile = function (fileName, contents) {
        fileName = fileName.replace(/.js/, ".d.ts");
        fileName = fileName.replace(/.mjs/, ".d.mts");
        createdFiles[fileName] = contents;
    };
    var program = ts.createProgram(files, _compilerOptions, host);
    program.emit();
    Object.entries(createdFiles).map(async function ([outName, content]) {
        if (existsSync(outName)) {
            await fs.unlink(outName);
        }
        const dir = path.dirname(outName);
        if (!existsSync(dir)) {
            await fs.mkdir(dir, { recursive: true });
        }
        await fs.writeFile(outName, content);
    });
    await forceRemoveDir(out_dir_to_remove);
}
