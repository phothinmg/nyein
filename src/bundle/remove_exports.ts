import path from "node:path";
import ts from "typescript";
import type { RemovedImportsContents } from "./remove_Import.js";

export interface RemovedImportsNExportsContents extends RemovedImportsContents {
	removeExportsContent?: string;
}

const $generateFileName = (entry: string) => {
	const _name = path.basename(entry).split(".")[0];
	const _fn = Buffer.from(_name).toString("hex");
	return `$var${_fn}`;
};
export function $removeEsmExports(
	deps: RemovedImportsContents[],
	compilerOptions: Partial<ts.CompilerOptions>,
): RemovedImportsNExportsContents[] {
	const remove = (
		dep: RemovedImportsContents,
	): RemovedImportsNExportsContents => {
		const sourceFile = ts.createSourceFile(
			dep.file,
			dep.removedImportsContent,
			ts.ScriptTarget.Latest,
			true,
		);
		const FILE_NAME = $generateFileName(dep.filePath);
		const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
			const { factory } = context;
			/**
			 * This function will be called for each node in the abstract syntax tree (AST) of the given source file.
			 * It will return a new node or an array of nodes, which will be used to replace the original node in the AST.
			 * If it returns `undefined`, the node will be removed from the AST.
			 *
			 * The goal of this function is to remove all export statements from the source file.
			 * There are three cases to consider:
			 * 1. A declaration (function, class, interface, type alias, enum, variable) with an "export" modifier.
			 * 2. An export declaration (e.g. `export { foo };`).
			 * 3. An export assignment (e.g. `export default Foo;`).
			 */
			function visitor(node: ts.Node): ts.Node | ts.Node[] | undefined {
				// --- Case 1: Strip "export" modifiers ---
				if (
					ts.isFunctionDeclaration(node) ||
					ts.isClassDeclaration(node) ||
					ts.isInterfaceDeclaration(node) ||
					ts.isTypeAliasDeclaration(node) ||
					ts.isEnumDeclaration(node) ||
					ts.isVariableStatement(node)
				) {
					const modifiers = node.modifiers?.filter(
						(m) =>
							m.kind !== ts.SyntaxKind.ExportKeyword &&
							m.kind !== ts.SyntaxKind.DefaultKeyword,
					);
					if (modifiers?.length !== node.modifiers?.length) {
						// If the node has an export modifier, remove it.
						// If the node is a function, class, interface, type alias, enum or variable declaration,
						// update the declaration by removing the export modifier.
						if (ts.isFunctionDeclaration(node)) {
							return factory.updateFunctionDeclaration(
								node,
								modifiers,
								node.asteriskToken,
								node.name ?? factory.createIdentifier(FILE_NAME),
								node.typeParameters,
								node.parameters,
								node.type,
								node.body,
							);
						}
						if (ts.isClassDeclaration(node)) {
							return factory.updateClassDeclaration(
								node,
								modifiers,
								node.name ?? factory.createIdentifier(FILE_NAME),
								node.typeParameters,
								node.heritageClauses,
								node.members,
							);
						}
						if (ts.isInterfaceDeclaration(node)) {
							return factory.updateInterfaceDeclaration(
								node,
								modifiers,
								node.name,
								node.typeParameters,
								node.heritageClauses,
								node.members,
							);
						}
						if (ts.isTypeAliasDeclaration(node)) {
							return factory.updateTypeAliasDeclaration(
								node,
								modifiers,
								node.name,
								node.typeParameters,
								node.type,
							);
						}
						if (ts.isEnumDeclaration(node)) {
							return factory.updateEnumDeclaration(
								node,
								modifiers,
								node.name,
								node.members,
							);
						}
						if (ts.isVariableStatement(node)) {
							return factory.updateVariableStatement(
								node,
								modifiers,
								node.declarationList,
							);
						}
					}
				} // --- Case 1
				// --- Case 2: Remove "export { foo }" entirely ---
				if (ts.isExportDeclaration(node)) {
					// If the node is an export declaration, remove it.
					return factory.createEmptyStatement();
				}
				// --- Case 3: Handle "export default ..." ---
				if (ts.isExportAssignment(node)) {
					const expr = node.expression;
					// export default Foo;   -> remove line
					if (ts.isIdentifier(expr)) {
						return factory.createEmptyStatement();
					} else {
						//TODO handle nameless default export
						console.warn("For now, just exit the process with an error code")
						// For now, just exit the process with an error code.
						process.exit(1);
					}
				} // --- Case 3
				return ts.visitEachChild(node, visitor, context); // visitor return
			} //visitor
			return (rootNode) => ts.visitNode(rootNode, visitor) as ts.SourceFile; // transformer return
		}; // transformer
		const transformationResult = ts.transform(
			sourceFile,
			[transformer],
			compilerOptions,
		);

		const transformedSourceFile = transformationResult.transformed[0];
		const printer = ts.createPrinter({
			newLine: ts.NewLineKind.LineFeed,
			removeComments: false,
		});

		const modifiedCode = printer.printFile(
			transformedSourceFile as ts.SourceFile,
		);
		transformationResult.dispose();
		// may be remove remain ";"
		const removeExportsContent = modifiedCode.replace(/^s*;\s*$/gm, "");
		return { ...dep, removeExportsContent };
	}; // remove
	const depsFiles = deps.slice(0, -1);
	const mainFileContent = deps.slice(-1);
	const depsFilesContent = depsFiles.map(remove);
	return depsFilesContent.concat(mainFileContent);
}
