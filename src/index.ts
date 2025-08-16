import ts from "typescript";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import bundle from "./lib/bundle.js";
import { wait, forceRemoveDir } from "./lib/helpers.js";
export interface BundlerOptions {
  entry: string;
  outDir: string;
  compilerOptions?: ts.CompilerOptions;
  customTsConfig?: string;
  check?: boolean;
  exit?: boolean;
}
//const root = process.cwd();

//
function _getOptions(
  compilerOptions?: ts.CompilerOptions,
  customTsConfig?: string
): ts.CompilerOptions {
  const root = process.cwd();
  const _configPath: string | undefined = customTsConfig
    ? path.join(root, customTsConfig)
    : path.join(root, "tsconfig.json");
  let _options: ts.CompilerOptions = {
    declaration: true,
    emitDeclarationOnly: true,
  };
  if (compilerOptions) {
    const { declaration, emitDeclarationOnly, ...rest } = compilerOptions;
    _options = { declaration: true, emitDeclarationOnly: true, ...rest };
  } else if (_configPath) {
    const absoluteConfigPath = path.resolve(_configPath);
    const configFile = ts.readConfigFile(absoluteConfigPath, ts.sys.readFile);
    const { declaration, emitDeclarationOnly, ...rest } =
      ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(absoluteConfigPath)
      ).options;
    _options = { declaration: true, emitDeclarationOnly: true, ...rest };
  }
  return _options;
}
//
export async function generateBundleDts({
  entry,
  outDir,
  compilerOptions = undefined,
  customTsConfig = undefined,
  check = true,
  exit = true,
}: BundlerOptions) {
  const root = process.cwd();
  const base_name = path.basename(entry).split(".")[0];
  const out_dir = path.join(root, outDir);
  if (!existsSync(out_dir)) {
    await fs.mkdir(out_dir);
  }
  const out_file = path.join(out_dir, `${base_name}.d.ts`);
  const bundle_file = await bundle({
    entry,
    customTsConfig,
    compilerOptions,
    check,
    exit,
  });
  await wait(500);
  const bundle_path = path.dirname(bundle_file.out_file);
  const _options: ts.CompilerOptions = _getOptions(
    compilerOptions,
    customTsConfig
  );
  await wait(500);
  const createdFiles: Record<string, string> = {};
  const host = ts.createCompilerHost(_options);
  host.writeFile = function (fileName, contents) {
    fileName = fileName.replace(/.js/, ".d.ts");
    fileName = fileName.replace(/.mjs/, ".d.mts");
    fileName = fileName.replace(/.cjs/, ".d.cts");
    createdFiles[fileName] = contents;
  };
  const program = ts.createProgram([bundle_file.out_file], _options, host);
  program.emit();
  await wait(1000);
  Object.entries(createdFiles).map(async function ([outName, content]) {
    await fs.writeFile(out_file, content);
  });
  //await fs.writeFile(out_file, dtsContent);
}
