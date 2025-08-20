// cSpell:disable
import ts from "typescript";
import { magenta } from "@lwe8/tcolor";
import getCompilerOptions from "../getCompilerOptions.js";

/**
 * Removes all import statements from a given TypeScript file.
 *
 * @param {string} filePath The path to the file to remove imports from.
 * @param {string} [customConfigPath] The path to a custom tsconfig.json file.
 */
function removeImports(
  code: string,
  filePath: string = "bundle.ts",
  customConfigPath?: string
): {
  modifiedCode: string;
  npmOrNodeImports: string[];
} {
  try {
    // Create a TypeScript source file
    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true
    );
    const compilerOptions = getCompilerOptions({
      customConfigPath,
    });
    if (Object.keys(compilerOptions).length === 0) {
      throw new Error(
        magenta(
          `Could not find "tsconfig.json" at root of your project or "options.customConfigPath".`
        )
      );
    }
    const removedStatements: string[] = [];
    const nodesToRemove: Set<ts.Node> = new Set();

    // ပထမအဆင့်မှာ ဖယ်ရှားရမယ့် nodes တွေကို collect လုပ်

    function collectNodes(node: ts.Node) {
      // Import declarations
      if (ts.isImportDeclaration(node)) {
        const text = node.getText(sourceFile);
        removedStatements.push(text);
        nodesToRemove.add(node);
        return;
      }

      // Import equals declarations
      if (ts.isImportEqualsDeclaration(node)) {
        const text = node.getText(sourceFile);
        removedStatements.push(text);
        nodesToRemove.add(node);
        return;
      }
      // Variable statements with require
      if (ts.isVariableStatement(node)) {
        const variableStatement = node;
        const requireDeclarations =
          variableStatement.declarationList.declarations.filter(
            (declaration) =>
              declaration.initializer &&
              ts.isCallExpression(declaration.initializer) &&
              ts.isIdentifier(declaration.initializer.expression) &&
              declaration.initializer.expression.text === "require"
          );

        if (requireDeclarations.length > 0) {
          if (
            requireDeclarations.length ===
            variableStatement.declarationList.declarations.length
          ) {
            // All declarations are requires, remove the whole statement
            const text = variableStatement.getText(sourceFile);
            removedStatements.push(text);
            nodesToRemove.add(node);
          } else {
            // Mixed declarations, collect individual require calls
            requireDeclarations.forEach((declaration) => {
              if (declaration.initializer) {
                const text = declaration.initializer.getText(sourceFile);
                removedStatements.push(text);
                nodesToRemove.add(declaration.initializer);
              }
            });
          }
        }
      }
      // Standalone require calls
      if (ts.isExpressionStatement(node)) {
        const expression = node.expression;
        if (
          ts.isCallExpression(expression) &&
          ts.isIdentifier(expression.expression) &&
          expression.expression.text === "require"
        ) {
          const text = node.getText(sourceFile);
          removedStatements.push(text);
          nodesToRemove.add(node);
        }
      }
      // visit tree
      ts.forEachChild(node, collectNodes);
    } // collectNodes function
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
      compilerOptions
    );

    const transformedSourceFile = transformationResult.transformed[0];
    const printer = ts.createPrinter({
      newLine: ts.NewLineKind.LineFeed,
      removeComments: false,
    });

    const modifiedCode = printer.printFile(
      transformedSourceFile as ts.SourceFile
    );
    transformationResult.dispose();
    // filter removed statements , that not from local like `./` or `../`
    const regexp = /["']((?!\.\/|\.\.\/)[^"']+)["']/;
    const npmOrNodeImports = removedStatements.filter((i) => regexp.test(i));
    return {
      modifiedCode,
      npmOrNodeImports,
    };
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    throw error;
  }
}

export default removeImports;
