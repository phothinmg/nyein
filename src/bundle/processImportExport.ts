import ts from "typescript";
import fs from "node:fs/promises";
import $fnCompilerOptions from "../compiler_options.js";

/* 



*/

interface ProcessImportExportOptions {
  code: string;
  filePath?: string;
  customConfigPath?: string | undefined;
  removeExports?: boolean;
}
interface ProcessImportExportResult {
  resultCode: string;
  moduleStatements: string[];
}

/**
 * @description Process source code by removing import statements, and export statements.
 * @param {ProcessImportExportOptions} options
 * @returns {ProcessImportExportResult}
 */
function processImportExport({
  code,
  filePath = "NyeinBundle.ts",
  customConfigPath = undefined,
  removeExports = true,
}: ProcessImportExportOptions): ProcessImportExportResult {
  // Create a TypeScript source file
  const sourceFileForRemoveImport = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true
  );
  const compilerOptions = $fnCompilerOptions.get(customConfigPath);
  const removedStatements: string[] = [];
  const nodesToRemove: Set<ts.Node> = new Set();
  // remove exports
  const remove_export = (code: string) => {
    // Create a TypeScript source file
    const sourceFileForRemoveExport = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true
    );
    const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
      const { factory } = context;

      function visitor(node: ts.Node): ts.Node | ts.Node[] {
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
              m.kind !== ts.SyntaxKind.DefaultKeyword
          );
          if (modifiers?.length !== node.modifiers?.length) {
            if (ts.isFunctionDeclaration(node)) {
              return factory.updateFunctionDeclaration(
                node,
                modifiers,
                node.asteriskToken,
                node.name ?? factory.createIdentifier("defaultExport"),
                node.typeParameters,
                node.parameters,
                node.type,
                node.body
              );
            }
            if (ts.isClassDeclaration(node)) {
              return factory.updateClassDeclaration(
                node,
                modifiers,
                node.name ?? factory.createIdentifier("defaultExport"),
                node.typeParameters,
                node.heritageClauses,
                node.members
              );
            }
            if (ts.isInterfaceDeclaration(node)) {
              return factory.updateInterfaceDeclaration(
                node,
                modifiers,
                node.name,
                node.typeParameters,
                node.heritageClauses,
                node.members
              );
            }
            if (ts.isTypeAliasDeclaration(node)) {
              return factory.updateTypeAliasDeclaration(
                node,
                modifiers,
                node.name,
                node.typeParameters,
                node.type
              );
            }
            if (ts.isEnumDeclaration(node)) {
              return factory.updateEnumDeclaration(
                node,
                modifiers,
                node.name,
                node.members
              );
            }
            if (ts.isVariableStatement(node)) {
              return factory.updateVariableStatement(
                node,
                modifiers,
                node.declarationList
              );
            }
          }
        } // --- Case 1
        // --- Case 2: Remove "export { foo }" entirely ---
        if (ts.isExportDeclaration(node)) return factory.createEmptyStatement();

        // --- Case 3: Handle "export default ..." ---
        if (ts.isExportAssignment(node)) {
          const expr = node.expression;

          // export default Foo;   -> remove line
          if (ts.isIdentifier(expr)) {
            return factory.createEmptyStatement();
          }

          // export default function() {}
          if (ts.isFunctionExpression(expr)) {
            return factory.createFunctionDeclaration(
              undefined,
              undefined,
              expr.name ?? factory.createIdentifier("defaultExport"),
              expr.typeParameters,
              expr.parameters,
              expr.type,
              expr.body
            );
          }

          // export default class {}
          if (ts.isClassExpression(expr)) {
            return factory.createClassDeclaration(
              undefined,
              expr.name ?? factory.createIdentifier("defaultExport"),
              expr.typeParameters,
              expr.heritageClauses,
              expr.members
            );
          }

          // fallback: const defaultExport = <expr>;
          return factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList(
              [
                factory.createVariableDeclaration(
                  factory.createIdentifier("defaultExport"),
                  undefined,
                  undefined,
                  expr
                ),
              ],
              ts.NodeFlags.Const
            )
          );
        } // --- Case 3
        // --- Case 4: Handle CommonJS exports ---
        if (
          ts.isExpressionStatement(node) &&
          ts.isBinaryExpression(node.expression)
        ) {
          const { left, right, operatorToken } = node.expression;
          if (operatorToken.kind !== ts.SyntaxKind.EqualsToken) return node;

          // module.exports = Foo;
          if (
            ts.isPropertyAccessExpression(left) &&
            ts.isIdentifier(left.expression) &&
            left.expression.text === "module" &&
            left.name.text === "exports"
          ) {
            if (ts.isIdentifier(right)) {
              return factory.createEmptyStatement(); // remove line if it's just referencing an identifier
            }
            if (ts.isFunctionExpression(right)) {
              return factory.createFunctionDeclaration(
                undefined,
                undefined,
                right.name ?? factory.createIdentifier("defaultExport"),
                right.typeParameters,
                right.parameters,
                right.type,
                right.body
              );
            }
            if (ts.isClassExpression(right)) {
              return factory.createClassDeclaration(
                undefined,
                right.name ?? factory.createIdentifier("defaultExport"),
                right.typeParameters,
                right.heritageClauses,
                right.members
              );
            }
            return factory.createVariableStatement(
              undefined,
              factory.createVariableDeclarationList(
                [
                  factory.createVariableDeclaration(
                    factory.createIdentifier("defaultExport"),
                    undefined,
                    undefined,
                    right
                  ),
                ],
                ts.NodeFlags.Const
              )
            );
          }

          // exports.foo = ...
          if (
            ts.isPropertyAccessExpression(left) &&
            ts.isIdentifier(left.expression) &&
            left.expression.text === "exports"
          ) {
            const name = left.name.text;

            if (ts.isFunctionExpression(right)) {
              return factory.createFunctionDeclaration(
                undefined,
                undefined,
                factory.createIdentifier(name),
                right.typeParameters,
                right.parameters,
                right.type,
                right.body
              );
            }

            if (ts.isClassExpression(right)) {
              return factory.createClassDeclaration(
                undefined,
                factory.createIdentifier(name),
                right.typeParameters,
                right.heritageClauses,
                right.members
              );
            }

            return factory.createVariableStatement(
              undefined,
              factory.createVariableDeclarationList(
                [
                  factory.createVariableDeclaration(
                    factory.createIdentifier(name),
                    undefined,
                    undefined,
                    right
                  ),
                ],
                ts.NodeFlags.Const
              )
            );
          }
        } // --- Case 4
        return ts.visitEachChild(node, visitor, context); // visitor return
      } // visitor
      return (rootNode) => ts.visitNode(rootNode, visitor) as ts.SourceFile; // transformer return
    }; // transformer
    // return for remove_export
    const transformationResult = ts.transform(
      sourceFileForRemoveExport,
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
    // may be remove remain ";"
    return modifiedCode.replace(/^s*;\s*$/gm, "");
  }; // remove_export

  function collectNodes(node: ts.Node) {
    // --- Case 1: Import declarations
    if (ts.isImportDeclaration(node)) {
      const text = node.getText(sourceFileForRemoveImport);
      removedStatements.push(text);
      nodesToRemove.add(node);
      return;
    } // --- Case 1
    //--- Case 2: Import equals declarations
    if (ts.isImportEqualsDeclaration(node)) {
      const text = node.getText(sourceFileForRemoveImport);
      removedStatements.push(text);
      nodesToRemove.add(node);
      return;
    } //--- Case 2
    // --- Case 3: Variable statements with require
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
          const text = variableStatement.getText(sourceFileForRemoveImport);
          removedStatements.push(text);
          nodesToRemove.add(node);
        } else {
          // Mixed declarations, collect individual require calls
          requireDeclarations.forEach((declaration) => {
            if (declaration.initializer) {
              const text = declaration.initializer.getText(
                sourceFileForRemoveImport
              );
              removedStatements.push(text);
              nodesToRemove.add(declaration.initializer);
            }
          });
        }
      }
    } // --- Case 3
    // --- Case 4: Standalone require calls
    if (ts.isExpressionStatement(node)) {
      const expression = node.expression;
      if (
        ts.isCallExpression(expression) &&
        ((ts.isIdentifier(expression.expression) &&
          expression.expression.text === "require") ||
          node.expression.kind === ts.SyntaxKind.ImportKeyword)
      ) {
        const text = node.getText(sourceFileForRemoveImport);
        removedStatements.push(text);
        nodesToRemove.add(node);
      }
    } // --- Case 4
    // walk child nodes of tree
    ts.forEachChild(node, collectNodes);
  } // collectNodes
  // ပထမအဆင့်မှာ ဖယ်ရှားရမယ့် nodes တွေကို collect လုပ်
  collectNodes(sourceFileForRemoveImport);
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
    sourceFileForRemoveImport,
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
  const moduleStatements = removedStatements.filter((i) => regexp.test(i));
  let resultCode = modifiedCode;
  if (removeExports) {
    resultCode = remove_export(modifiedCode);
  }
  return {
    resultCode,
    moduleStatements,
  };
}

/**
 * @description Process import and export statements from array of file paths.
 * Process import and export statements from array of file paths.
 * Read file content from each file, process import and export statements.
 * Return object with keys `moduleImports` and `resultContents`.
 * `moduleImports` is an array of strings, that contains import statements
 * from all files. `resultContents` is an array of strings, that contains
 * processed file content.
 * @param {string[]} depsFiles - Array of file paths.
 * @param {string|undefined} [customConfigPath] - Path to custom tsconfig.json.
 * @returns {Promise<{moduleImports: string[], resultContents: string[]}>}
 */
async function processImportExportFromDepsFiles(
  depsFiles: string[],
  customConfigPath: string | undefined = undefined
): Promise<{ moduleImports: string[]; resultContents: string[] }> {
  const moduleImports: string[] = [];
  const resultContents: string[] = [];
  for await (const file of depsFiles) {
    const fileContent = await fs.readFile(file, "utf8");
    const processedIE = processImportExport({
      code: fileContent,
      filePath: file,
      customConfigPath,
      removeExports: true,
    });
    resultContents.push(processedIE.resultCode);
    if (processedIE.moduleStatements) {
      for (const ms of processedIE.moduleStatements) {
        moduleImports.push(ms);
      }
    }
  }
  return { moduleImports, resultContents };
}

interface ProcessImportExportFromDAGTreeOptions {
  dagTree: string[];
  customConfigPath?: string | undefined;
  allowBanner?: boolean;
  nyeinBannerText?: string | undefined;
}

/**
 * Process import and export statements from the given dependency array graph tree.
 * Return string that contains merged content of all files, with processed import and export statements.
 * @param {ProcessImportExportFromDAGTreeOptions} options - Options object.
 * @param {string[]} options.dagTree - Dependency array graph tree.
 * @param {string|undefined} [options.customConfigPath] - Path to custom tsconfig.json.
 * @param {boolean} [options.allowBanner=true] - Allow or disallow to include banner text.
 * @param {string|undefined} [options.nyeinBannerText=""] - Banner text.
 * @returns {Promise<string>} - Processed content of all files.
 */
async function processImportExportFromDAGTree({
  dagTree,
  customConfigPath = undefined,
  allowBanner = true,
  nyeinBannerText = "",
}: ProcessImportExportFromDAGTreeOptions): Promise<string> {
  console.time("merged files");
  const mainFilePath = dagTree.slice(-1).join("");
  const depsFiles = dagTree.slice(0, -1);
  const { moduleImports, resultContents } =
    await processImportExportFromDepsFiles(depsFiles, customConfigPath);
  const main_raw = await fs.readFile(mainFilePath, "utf8");
  const processedIE = processImportExport({
    code: main_raw,
    filePath: mainFilePath,
    customConfigPath,
    removeExports: false,
  });
  let _imports = moduleImports.concat(processedIE.moduleStatements);
  // remove duplicate imports
  _imports = Array.from(new Set(_imports));
  let _banner = allowBanner ? nyeinBannerText : "";
  console.timeEnd("merged files");
  return `${_banner}\n${_imports.join("\n")}\n${resultContents.join("\n")}\n${
    processedIE.resultCode
  }\n`.trim();
}

export default processImportExportFromDAGTree;
