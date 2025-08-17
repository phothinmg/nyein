import fs from "node:fs/promises";
import ts from "typescript";
import path from "node:path";
import checks from "./check/index.js";
import bundle from "./bundle.js";
import { existsSync } from "node:fs";
import { forceRemoveDir } from "./opt/helpers.js";
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
  moduleResolution: ts.ModuleResolutionKind;
  /**
   * Types check and check for duplicate declarations
   *
   * @default true
   */
  check?: boolean;
  /**
   * If `options.check` true , when error exit process or not.
   *
   * @default true
   */
  exit?: boolean;
  tsConfigPath?: string;
}

async function compile({
  entry,
  outDir,
  module,
  moduleResolution,
  check = true,
  exit = true,
  tsConfigPath = undefined,
}: CompileOptions) {
  const temp_dir = "._nyein";
  const _compilerOptions = checks
    .getCompilerOptions()
    .getOptions(outDir, module, moduleResolution, tsConfigPath);
  if (!_compilerOptions) {
    throw new Error("Error");
  }
  const _bundle = await bundle({
    entry: entry,
    outDir: temp_dir,
    check,
    write: true,
    exit,
  });
  const out_dir_to_remove = path.dirname(_bundle.out_file);
  const files = [_bundle.out_file];
  const createdFiles: Record<string, string> = {};
  const host = ts.createCompilerHost(_compilerOptions);
  host.writeFile = function (fileName, contents) {
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
