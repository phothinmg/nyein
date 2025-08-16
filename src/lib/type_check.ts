//Check TypeScript Files With Immediate Exit
import ts from "typescript";
import * as path from "path";
import * as process from "process";
import { magenta, italic } from "@lwe8/tcolor";
export interface TypeCheckOptions {
  filePaths: string[];
  configPath?: string;
  isExit?: boolean;
  options?: ts.CompilerOptions;
}
function findConfigFile(filePath: string): string | undefined {
  let dir = path.dirname(filePath);
  while (dir !== path.dirname(dir)) {
    const configPath = path.join(dir, "tsconfig.json");
    if (ts.sys.fileExists(configPath)) {
      return configPath;
    }
    dir = path.dirname(dir);
  }
  return undefined;
}
function _getCompilerOptions(
  compilerOptions?: ts.CompilerOptions,
  customConfigPath?: string
): ts.CompilerOptions {
  const root = process.cwd();
  const _configPath: string | undefined = customConfigPath
    ? path.join(root, customConfigPath)
    : path.join(root, "tsconfig.json");
  let _options: ts.CompilerOptions = { noEmit: true, strict: true };
  if (compilerOptions) {
    const { noEmit, strict, ...rest } = compilerOptions;
    _options = { noEmit: true, strict: true, ...rest };
  } else if (_configPath) {
    const absoluteConfigPath = path.resolve(_configPath);
    const configFile = ts.readConfigFile(absoluteConfigPath, ts.sys.readFile);
    const { noEmit, strict, ...rest } = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(absoluteConfigPath)
    ).options;
    _options = { noEmit: true, strict: true, ...rest };
  }
  return _options;
}
export function typeCheckFromFile({
  filePaths,
  configPath = undefined,
  isExit = true,
  options = undefined,
}: TypeCheckOptions) {
  const absoluteFilePaths = filePaths.map((fp) => path.resolve(fp));
  const compilerOptions: ts.CompilerOptions = _getCompilerOptions(
    options,
    configPath
  );

  // Create program
  const program = ts.createProgram(absoluteFilePaths, compilerOptions);

  // Check each file individually for immediate feedback
  for (const filePath of absoluteFilePaths) {
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) {
      console.error(italic(magenta(`File not found: ${filePath}`)));
      process.exit(1);
    }

    const diagnostics = [
      ...program.getSyntacticDiagnostics(sourceFile),
      ...program.getSemanticDiagnostics(sourceFile),
      ...program.getDeclarationDiagnostics(sourceFile),
    ];

    if (diagnostics.length > 0) {
      const formatHost: ts.FormatDiagnosticsHost = {
        getCurrentDirectory: () => process.cwd(),
        getCanonicalFileName: (fileName) => fileName,
        getNewLine: () => ts.sys.newLine,
      };
      console.error(
        italic(
          magenta(
            ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost)
          )
        )
      );
      console.error(
        italic(magenta(`TypeScript check failed in file: ${filePath}`))
      );
      if (isExit) {
        process.exit(1);
      }
    }
  }
}
interface TypeCheckContentOptions {
  code: string;
  fileName?: string;
  configPath?: string;
  options?: ts.CompilerOptions;
  isExit?: boolean;
}
export function typeCheckForFinalContent({
  code,
  fileName = "bundled.ts",
  configPath = undefined,
  options = undefined,
  isExit = true,
}: TypeCheckContentOptions) {
  const sourceFile = ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    true
  );
  const compilerOptions: ts.CompilerOptions = _getCompilerOptions(
    options,
    configPath
  );
  const host: ts.CompilerHost = {
    fileExists: (filePath) => filePath === fileName,
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => process.cwd(),
    getDirectories: () => [],
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    getNewLine: () => ts.sys.newLine,
    getSourceFile: (filePath) =>
      filePath === fileName ? sourceFile : undefined,
    readFile: () => undefined,
    useCaseSensitiveFileNames: () => true,
    writeFile: () => {},
  };
  const program = ts.createProgram([fileName], compilerOptions, host);
  const diagnostics = [
    ...program.getSyntacticDiagnostics(sourceFile),
    ...program.getSemanticDiagnostics(sourceFile),
    ...program.getDeclarationDiagnostics(sourceFile),
  ];
  if (diagnostics.length > 0) {
    const formatHost: ts.FormatDiagnosticsHost = {
      getCurrentDirectory: () => process.cwd(),
      getCanonicalFileName: (fileName) => fileName,
      getNewLine: () => ts.sys.newLine,
    };
    console.error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost)
    );
    console.error(`TypeScript check failed in file: ${fileName}`);
    if (isExit) {
      process.exit(1);
    }
  }
}
