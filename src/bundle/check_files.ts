// cSpell:disable

import path from "node:path";
import { magenta } from "@lwe8/tcolor";
import ts from "typescript";
import type { DependenciesContents } from "./get_deps_contents.js";

const jsesm_exts = [".js", ".mjs"];
const jscjs_exts = [".cjs"];
const tsesm_exts = [".ts", ".mts"];
const tscjs_exts = [".cts"];
const jsx_exts = [".jsx", ".tsx"];
const all_exts = [
	...jscjs_exts,
	...jsesm_exts,
	...tscjs_exts,
	...tsesm_exts,
	...jsx_exts,
];

function checkExtGroup(deps: DependenciesContents[]) {
	const exts = deps.map((dep) => {
		return path.extname(dep.filePath);
	});
	const jsesmSet = new Set(jsesm_exts);
	const jscjsSet = new Set(jscjs_exts);
	const tsesmSet = new Set(tsesm_exts);
	const tscjsSet = new Set(tscjs_exts);
	const jsxSet = new Set(jsx_exts);
	const allSet = new Set(all_exts);
	const isCjs =
		exts.every((i) => jscjsSet.has(i)) || exts.every((i) => tscjsSet.has(i));
	const isJsx = exts.every((i) => jsxSet.has(i));
	const isJs = exts.every((i) => jsesmSet.has(i));
	const isTs = exts.every((i) => tsesmSet.has(i));
	const isBoth = isJs && isTs;
	const isNone = !exts.every((i) => allSet.has(i));
	if (isNone) {
		console.warn(
			magenta(
				"Bundler detects none Javascript or Typescript extensions in the dependencies tree.",
			),
		);
		process.exit(1);
	}
	if (isJsx) {
		console.warn(
			magenta(
				"Bundler detects JSX extensions (.jsx or .tsx) in the dependencies tree, which is currently unsupported.",
			),
		);
		process.exit(1);
	}
	if (isCjs) {
		console.warn(
			magenta(
				"Bundler detects commonjs extensions (.cjd or .cts) in the dependencies tree, which is currently unsupported.",
			),
		);
		process.exit(1);
	}
	if (isBoth) {
		console.warn(
			magenta(
				"Bundler detects both Javascript or Typescript extensions in the dependencies tree, currently unsupport only Javascript or Typescript extensions   but will be supported in future versions.",
			),
		);
		process.exit(1);
	}

	return true;
}

function checkModuleFormat(deps: DependenciesContents[]) {
	let _esmCount = 0;
	let cjsCount = 0;
	let unknowCount = 0;
	for (const dep of deps) {
		try {
			// Create a TypeScript source file
			const sourceFile = ts.createSourceFile(
				dep.filePath,
				dep.content,
				ts.ScriptTarget.Latest,
				true,
			);

			let hasESMImports = false;
			let hasCommonJS = false;
			// Walk through the AST to detect module syntax
			function walk(node: ts.Node) {
				// Check for ESM import/export syntax
				if (
					ts.isImportDeclaration(node) ||
					ts.isImportEqualsDeclaration(node) ||
					ts.isExportDeclaration(node) ||
					ts.isExportSpecifier(node) ||
					ts.isExportAssignment(node)
				) {
					hasESMImports = true;
				}

				// Check for export modifier on declarations
				if (
					(ts.isVariableStatement(node) ||
						ts.isFunctionDeclaration(node) ||
						ts.isInterfaceDeclaration(node) ||
						ts.isTypeAliasDeclaration(node) ||
						ts.isEnumDeclaration(node) ||
						ts.isClassDeclaration(node)) &&
					node.modifiers?.some(
						(mod) => mod.kind === ts.SyntaxKind.ExportKeyword,
					)
				) {
					hasESMImports = true;
				}

				// Check for CommonJS require/exports
				if (ts.isCallExpression(node)) {
					if (
						ts.isIdentifier(node.expression) &&
						node.expression.text === "require" &&
						node.arguments.length > 0
					) {
						hasCommonJS = true;
					}
				}

				// Check for module.exports or exports.xxx
				if (ts.isPropertyAccessExpression(node)) {
					const text = node.getText(sourceFile);
					if (
						text.startsWith("module.exports") ||
						text.startsWith("exports.")
					) {
						hasCommonJS = true;
					}
				}

				// Continue walking the AST
				ts.forEachChild(node, walk);
			}
			walk(sourceFile);

			// Determine the module format based on what we found
			if (hasESMImports && !hasCommonJS) {
				_esmCount++;
			} else if (hasCommonJS && !hasESMImports) {
				cjsCount++;
			} else if (hasESMImports && hasCommonJS) {
				// Mixed - probably ESM with dynamic imports or similar
				_esmCount++;
			}
		} catch (error) {
			console.error(
				magenta(`Error checking module format for ${dep.file}:`),
				magenta(error),
			);
			unknowCount++;
		}
	} // loop
	if (unknowCount) {
		console.warn(
			magenta(
				"Unknown error when checking module types in the dependencies tree,bundler error to fix.",
			),
		);
		process.exit(1);
	}
	if (cjsCount) {
		console.warn(
			magenta(
				"Bundler detects both ESM and CommonJs formats(Mixed) or CommonJs format  in the dependencies tree, bundler currently support only ESM module format but will be supported in future versions.",
			),
		);
		process.exit(1);
	}
	return true;
}

export default function checkFileExtensionAndFormat(
	deps: DependenciesContents[],
) {
	console.time("checked file extensions and module type");
	const ce = checkExtGroup(deps);
	const cm = checkModuleFormat(deps);
	console.timeEnd("checked file extensions and module type");
	return ce && cm;
}
