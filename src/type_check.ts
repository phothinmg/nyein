//Check TypeScript Files With Immediate Exit
import ts from "typescript";
import * as path from "path";
import * as process from "process";

interface TypeCheckOptions {
  filePaths: string[];
  configPath?: string;
  isExit?: boolean;
}
export default function checkTypes({
  filePaths,
  configPath = undefined,
  isExit = true,
}: TypeCheckOptions) {
  const absoluteFilePaths = filePaths.map((fp) => path.resolve(fp));
  const absoluteConfigPath = configPath
    ? path.resolve(configPath)
    : findConfigFile(absoluteFilePaths[0]);

  let compilerOptions: ts.CompilerOptions = {
    noEmit: true,
    strict: true,
    noImplicitAny: true,
    allowJs: true,
  };

  if (absoluteConfigPath) {
    const configFile = ts.readConfigFile(absoluteConfigPath, ts.sys.readFile);
    compilerOptions = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(absoluteConfigPath)
    ).options;
  }

  // Create program
  const program = ts.createProgram(absoluteFilePaths, compilerOptions);

  // Check each file individually for immediate feedback
  for (const filePath of absoluteFilePaths) {
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) {
      console.error(`File not found: ${filePath}`);
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
        ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost)
      );
      console.error(`TypeScript check failed in file: ${filePath}`);
      if (isExit) {
        process.exit(1);
      }
    }
  }

  //console.log("All TypeScript files are valid!");
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
// Usage
//checkTypeScriptFilesWithImmediateExit(filesToCheck, './tsconfig.json');
