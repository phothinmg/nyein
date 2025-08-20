// cSpell:disable
import ts from "typescript";
import { magenta } from "@lwe8/tcolor";
import getCompilerOptions from "../getCompilerOptions.js";

function removeExports(
  code: string,
  filePath: string = "bundle.ts",
  customConfigPath?: string
) {
  try {
    // Create a TypeScript source file
    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true
    );
    // get compiler options
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

    // Create transformer to handle ALL export declarations
    const transformer =
      <T extends ts.Node>(context: ts.TransformationContext) =>
      (rootNode: T): T => {
        const visitor: ts.Visitor = (node) => {
          // 1. Handle export keyword for variable, function, class, interface, type, enum declarations
          const modifiers = ts.getModifiers(node as ts.HasModifiers);
          const hasExport = modifiers?.some(
            (m) => m.kind === ts.SyntaxKind.ExportKeyword
          );
          if (hasExport) {
            // Remove only the export keyword, keep the declaration
            const newModifiers = modifiers?.filter(
              (m) => m.kind !== ts.SyntaxKind.ExportKeyword
            );

            if (ts.isVariableStatement(node)) {
              return ts.factory.updateVariableStatement(
                node,
                newModifiers,
                node.declarationList
              );
            } else if (ts.isFunctionDeclaration(node)) {
              return ts.factory.updateFunctionDeclaration(
                node,
                newModifiers,
                node.asteriskToken,
                node.name,
                node.typeParameters,
                node.parameters,
                node.type,
                node.body
              );
            } else if (ts.isClassDeclaration(node)) {
              return ts.factory.updateClassDeclaration(
                node,
                newModifiers,
                node.name,
                node.typeParameters,
                node.heritageClauses,
                node.members
              );
            } else if (ts.isInterfaceDeclaration(node)) {
              return ts.factory.updateInterfaceDeclaration(
                node,
                newModifiers,
                node.name,
                node.typeParameters,
                node.heritageClauses,
                node.members
              );
            } else if (ts.isTypeAliasDeclaration(node)) {
              return ts.factory.updateTypeAliasDeclaration(
                node,
                newModifiers,
                node.name,
                node.typeParameters,
                node.type
              );
            } else if (ts.isEnumDeclaration(node)) {
              return ts.factory.updateEnumDeclaration(
                node,
                newModifiers,
                node.name,
                node.members
              );
            } else if (ts.isModuleDeclaration(node)) {
              return ts.factory.updateModuleDeclaration(
                node,
                newModifiers,
                node.name,
                node.body
              );
            }
          } //1 hasExport

          // 2. Handle export default declarations
          if (ts.isExportAssignment(node) && !node.isExportEquals) {
            // For export default anonymous functions/classes
            if (
              ts.isFunctionExpression(node.expression) ||
              ts.isClassExpression(node.expression)
            ) {
              // Convert to regular function/class declaration
              if (ts.isFunctionExpression(node.expression)) {
                return ts.factory.createFunctionDeclaration(
                  undefined,
                  undefined,
                  ts.factory.createIdentifier("defaultFunction"),
                  undefined,
                  node.expression.parameters,
                  node.expression.type,
                  node.expression.body
                );
              } else if (ts.isClassExpression(node.expression)) {
                return ts.factory.createClassDeclaration(
                  undefined,
                  ts.factory.createIdentifier("defaultClass"),
                  undefined,
                  node.expression.heritageClauses,
                  node.expression.members
                );
              }
            }
            // For export default identifier (function foo() {}; export default foo)
            return ts.factory.createExpressionStatement(node.expression);
          } //2
          // 3. Handle export = syntax (CommonJS)
          if (ts.isExportAssignment(node) && node.isExportEquals) {
            // Convert export = foo to const exports = foo
            return ts.factory.createVariableStatement(
              undefined,
              ts.factory.createVariableDeclarationList(
                [
                  ts.factory.createVariableDeclaration(
                    "exports",
                    undefined,
                    undefined,
                    node.expression
                  ),
                ],
                ts.NodeFlags.Const
              )
            );
          } //3
          // 4. Handle named exports (export { a, b, c })
          if (ts.isExportDeclaration(node) && !node.moduleSpecifier) {
            return undefined; // Remove completely
          } // 4

          // 5. Handle export from (export { a, b } from 'module')
          if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
            return undefined; // Remove completely
          } // 5

          // 6. Handle exports.foo = ... pattern
          if (ts.isExpressionStatement(node)) {
            const expression = node.expression;

            if (
              ts.isBinaryExpression(expression) &&
              expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
            ) {
              const left = expression.left;

              // Check for exports.foo pattern
              if (ts.isPropertyAccessExpression(left)) {
                const objectName = left.expression.getText();
                if (objectName === "exports") {
                  // Convert exports.foo = ... to const foo = ...
                  const propertyName = left.name.getText();
                  return ts.factory.createVariableStatement(
                    undefined,
                    ts.factory.createVariableDeclarationList(
                      [
                        ts.factory.createVariableDeclaration(
                          propertyName,
                          undefined,
                          undefined,
                          expression.right
                        ),
                      ],
                      ts.NodeFlags.Const
                    )
                  );
                }
              }
            }
          } // 6
          // 7. Handle module.exports = ... pattern
          if (ts.isExpressionStatement(node)) {
            const expression = node.expression;

            if (
              ts.isBinaryExpression(expression) &&
              expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
            ) {
              const left = expression.left;

              // Check for module.exports pattern
              if (ts.isPropertyAccessExpression(left)) {
                const leftText = left.getText();
                if (leftText === "module.exports") {
                  // Convert module.exports = ... to const exports = ...
                  return ts.factory.createVariableStatement(
                    undefined,
                    ts.factory.createVariableDeclarationList(
                      [
                        ts.factory.createVariableDeclaration(
                          "exports",
                          undefined,
                          undefined,
                          expression.right
                        ),
                      ],
                      ts.NodeFlags.Const
                    )
                  );
                }
              }
            }
          } // 7
          // 8. Handle declare export patterns
          if (
            modifiers?.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword) &&
            hasExport
          ) {
            // Remove both declare and export keywords, keep the declaration
            const newModifiers = modifiers.filter(
              (m) =>
                m.kind !== ts.SyntaxKind.ExportKeyword &&
                m.kind !== ts.SyntaxKind.DeclareKeyword
            );

            if (ts.isVariableStatement(node)) {
              return ts.factory.updateVariableStatement(
                node,
                newModifiers,
                node.declarationList
              );
            } else if (ts.isFunctionDeclaration(node)) {
              return ts.factory.updateFunctionDeclaration(
                node,
                newModifiers,
                node.asteriskToken,
                node.name,
                node.typeParameters,
                node.parameters,
                node.type,
                node.body
              );
            }
            // Handle other declare export patterns similarly...
          } // 8
          return ts.visitEachChild(node, visitor, context);
        }; // visitor
        return ts.visitNode(rootNode, visitor) as T;
      }; // transformer

    // Create a transformation context and apply the transformer
    const transformationResult = ts.transform(
      sourceFile,
      [transformer],
      compilerOptions
    );

    const transformedSourceFile = transformationResult.transformed[0];

    // Generate the modified source code
    const printer = ts.createPrinter({
      newLine: ts.NewLineKind.LineFeed,
      removeComments: false,
    });

    const result = printer.printFile(transformedSourceFile as ts.SourceFile);

    transformationResult.dispose();
    return result;
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    throw error;
  }
}

export default removeExports;
