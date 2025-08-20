import ts from "typescript";
import getCompilerOptions from "../../getCompilerOptions.js";
import path from "node:path";
import { italic, magenta } from "@lwe8/tcolor";
interface TypesCheckOptions {
  filePaths: string[];
  customConfigPath?: string;
}

/**
 * Performs type checking on a list of files.
 *
 * @param {{ filePaths: string[]; customConfigPath?: string; }} options
 * @param {string[]} options.filePaths List of files to check.
 * @param {string} [options.customConfigPath] Path to a custom tsconfig.json file.
 */
export default function typesCheck({
  filePaths,
  customConfigPath = undefined,
}: TypesCheckOptions) {
  const absoluteFilePaths = filePaths.map((fp) => path.resolve(fp));
  const defaultOptions: Partial<ts.CompilerOptions> = {
    noEmit: true,
    strict: true,
  };
  const compilerOptions = getCompilerOptions({
    customConfigPath,
    defaultOptions,
  });
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
        magenta(
          ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost)
        )
      );
      //   console.error(
      //     italic(magenta(`TypeScript check failed in file: ${filePath}`))
      //   );

      process.exit(1);
    }
  }
}
