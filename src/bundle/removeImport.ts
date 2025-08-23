import ts from "typescript";
import type { DependenciesContents } from "./getDepsContents.js";

export interface RemovedImportsContents extends DependenciesContents {
	removedImportsContent: string;
	moduleStatements: string[];
}

export function $removeEsmImports(
	deps: DependenciesContents[],
	compilerOptions: Partial<ts.CompilerOptions>,
) {
	const remove = (dep: DependenciesContents): RemovedImportsContents => {
		const removedStatements: string[] = [];
		const nodesToRemove: Set<ts.Node> = new Set();
		const sourceFile = ts.createSourceFile(
			dep.file,
			dep.content,
			ts.ScriptTarget.Latest,
			true,
		);

		function collectNodes(node: ts.Node) {
			// --- Case 1: Import declarations
			if (ts.isImportDeclaration(node)) {
				const text = node.getText(sourceFile);
				removedStatements.push(text);
				nodesToRemove.add(node);
				return;
			} // --- Case 1
			//--- Case 2: Import equals declarations
			if (ts.isImportEqualsDeclaration(node)) {
				const text = node.getText(sourceFile);
				removedStatements.push(text);
				nodesToRemove.add(node);
				return;
			} //--- Case 2
			ts.forEachChild(node, collectNodes);
		} // collectNodes
		// ပထမအဆင့်မှာ ဖယ်ရှားရမယ့် nodes တွေကို collect လုပ်
		collectNodes(sourceFile);
		// ဒုတိယအဆင့်မှာ ဖယ်ရှား
		// Create transformer to remove collected nodes
		const transformer =
			<T extends ts.Node>(context: ts.TransformationContext) =>
			(rootNode: T): T => {
				const visitor: ts.Visitor = (node) => {
					if (nodesToRemove.has(node)) {
						return undefined;
					}
					return ts.visitEachChild(node, visitor, context);
				};

				return ts.visitNode(rootNode, visitor) as T;
			};
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

		const removedImportsContent = printer.printFile(
			transformedSourceFile as ts.SourceFile,
		);
		transformationResult.dispose();
		// filter removed statements , that not from local like `./` or `../`
		const regexp = /["']((?!\.\/|\.\.\/)[^"']+)["']/;
		const moduleStatements = removedStatements.filter((i) => regexp.test(i));
		return { ...dep, removedImportsContent, moduleStatements };
	};
	return deps.map(remove);
}
