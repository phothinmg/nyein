import path from "node:path";
import * as process from "node:process";
import { magenta } from "@lwe8/tcolor";
import ts from "typescript";
import { isPlainObject } from "./helpers.js";

interface GetCompilerOptions {
  customConfigPath?: string;
  defaultOptions?: Partial<ts.CompilerOptions>;
}
const root = process.cwd();
function get_compiler_options({
  customConfigPath,
  defaultOptions = {},
}: GetCompilerOptions): Partial<ts.CompilerOptions> {
  const configPath = customConfigPath
    ? path.resolve(root, customConfigPath)
    : ts.findConfigFile(root, ts.sys.fileExists);

  if (configPath) {
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    const basePath = path.dirname(configPath);
    const parsed = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      basePath
    );
    return { ...parsed.options, ...defaultOptions };
  }

  return { ...defaultOptions };
}
// error logs
const $cpLog = magenta(
  `Could not find "tsconfig.json" at root of your project or "options.customConfigPath".`
);
// functions object
const $fnCompilerOptions = {
  get(customConfigPath?: string) {
    const co = get_compiler_options({ customConfigPath });
    if (isPlainObject(co)) {
      throw new Error($cpLog);
    }
    return co;
  },
  dts(outDir: string, customConfigPath?: string) {
    const co = get_compiler_options({
      customConfigPath,
      defaultOptions: {
        declaration: true,
        emitDeclarationOnly: true,
        outDir: path.resolve(root, outDir),
      },
    });
    if (isPlainObject(co)) {
      throw new Error($cpLog);
    }
    return co;
  },
  compile(
    outDir: string,
    module: ts.ModuleKind,
    declaration: boolean,
    customConfigPath?: string
  ) {
    const co = get_compiler_options({
      customConfigPath,
      defaultOptions: {
        declaration: declaration,
        outDir: path.resolve(root, outDir),
        module: module,
      },
    });
    if (isPlainObject(co)) {
      throw new Error($cpLog);
    }
    return co;
  },
  type(customConfigPath?: string) {
    const co = get_compiler_options({
      customConfigPath,
      defaultOptions: {
        noEmit: true,
        strict: true,
      },
    });
    if (isPlainObject(co)) {
      throw new Error($cpLog);
    }
    return co;
  },
};

export default $fnCompilerOptions;
