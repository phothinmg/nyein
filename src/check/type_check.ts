//Check TypeScript Files With Immediate Exit
import * as path from "node:path";
import * as process from "node:process";
import { italic, magenta } from "@lwe8/tcolor";
import ts from "typescript";
import getCompilerOptions from "./get_options.js";
export interface TypeCheckOptions {
	filePaths: string[];
	exit?: boolean;
	compileOptsOrPath?: string | ts.CompilerOptions;
}

export default function typeCheckFromFile({
	filePaths,
	exit = true,
	compileOptsOrPath = undefined,
}: TypeCheckOptions) {
	const absoluteFilePaths = filePaths.map((fp) => path.resolve(fp));
	const compilerOptions: ts.CompilerOptions =
		getCompilerOptions(compileOptsOrPath).forTypeCheck;

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
						ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost),
					),
				),
			);
			console.error(
				italic(magenta(`TypeScript check failed in file: ${filePath}`)),
			);
			if (exit) {
				process.exit(1);
			}
		}
	}
}
