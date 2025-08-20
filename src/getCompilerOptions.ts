import path from "node:path";
import ts from "typescript";
import * as process from "node:process";

export interface GetCompilerOptions {
  customConfigPath?: string;
  defaultOptions?: Partial<ts.CompilerOptions>;
}

export default function getCompilerOptions({
    customConfigPath,
    defaultOptions = {},
}: GetCompilerOptions): Partial<ts.CompilerOptions> {
    const root = process.cwd();
    const configPath = customConfigPath
        ? path.resolve(root, customConfigPath)
        : ts.findConfigFile(root, ts.sys.fileExists);

    if (configPath) {
        const config = ts.readConfigFile(configPath, ts.sys.readFile);
        const basePath = path.dirname(configPath);
        const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, basePath);
        return { ...parsed.options, ...defaultOptions };
    }

    return { ...defaultOptions };
}
