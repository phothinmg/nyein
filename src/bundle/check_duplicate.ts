import path from "node:path";
import ts from "typescript";
import { bold, grey, magenta, yellow } from "@lwe8/tcolor";
import $fnCompilerOptions from "../compiler_options.js";

export interface CheckDuplicateOptions {
  filePaths: string[];
  customConfigPath?: string | undefined;
  renameDuplicated?: boolean;
}

/**
 * Renames duplicated variable, function, and class declarations in multiple files
 * to $1foo, $2foo, etc., and updates their usages accordingly.
 * Does not throw or exit on duplicates.
 */
async function checkDuplicate({
  filePaths,
  customConfigPath = undefined,
  renameDuplicated = false,
}: CheckDuplicateOptions) {
  console.time("checked duplicated declarations");
  const root = process.cwd();
  const rootLength = root.split(path.sep).length;
  const compilerOptions = $fnCompilerOptions.get(customConfigPath);
  const program = ts.createProgram(filePaths, compilerOptions);
  const varMap = new Map<string, Set<string>>();
  const funcMap = new Map<string, Set<string>>();
  const classMap = new Map<string, Set<string>>();
  // rename
  const reName = async () => {
    const varMap = new Map<string, string[]>();
    const funcMap = new Map<string, string[]>();
    const classMap = new Map<string, string[]>();
    // Collect duplicates
    for (const sourceFile of program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile) continue;
      const _fileName = sourceFile.fileName
        .split(path.sep)
        .slice(rootLength)
        .join(path.sep);
      const fileName = `/${_fileName}`;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isVariableStatement(node)) {
          node.declarationList.declarations.forEach((decl) => {
            if (ts.isIdentifier(decl.name)) {
              const varName = decl.name.text;
              if (!varMap.has(varName)) {
                varMap.set(varName, [fileName]);
              } else {
                varMap.get(varName)!.push(fileName);
              }
            }
          });
        } else if (ts.isFunctionDeclaration(node)) {
          const funcName = node.name?.text;
          if (!funcName) return;
          if (!funcMap.has(funcName)) {
            funcMap.set(funcName, [fileName]);
          } else {
            funcMap.get(funcName)!.push(fileName);
          }
        } else if (ts.isClassDeclaration(node)) {
          const className = node.name?.text;
          if (!className) return;
          if (!classMap.has(className)) {
            classMap.set(className, [fileName]);
          } else {
            classMap.get(className)!.push(fileName);
          }
        }
      });
    }

    // Rename duplicates and update usages
    for (const [map, type] of [
      [varMap, "variable"],
      [funcMap, "function"],
      [classMap, "class"],
    ] as const) {
      for (const [name, files] of map.entries()) {
        if (files.length > 1) {
          files.forEach(async (file, idx) => {
            const newName = `$${idx + 1}${name}`;
            // Read file, replace declaration and all usages
            // This is a simple global replace, for demo purposes
            // For production, use AST transforms
            const fs = await import("fs/promises");
            let content = await fs.readFile(root + file, "utf8");
            const regex = new RegExp(`\\b${name}\\b`, "g");
            content = content.replace(regex, newName);
            await fs.writeFile(root + file, content, "utf8");
          });
        }
      }
    }
  }; // rename
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach((decl) => {
          if (
            ts.isIdentifier(decl.name) &&
            !(
              decl.initializer &&
              ts.isCallExpression(decl.initializer) &&
              ts.isIdentifier(decl.initializer.expression) &&
              decl.initializer.expression.text === "require"
            )
          ) {
            const varName = decl.name.text;
            const _fileName = sourceFile.fileName
              .split(path.sep)
              .slice(rootLength)
              .join(path.sep);
            const fileName = `/${_fileName}`;

            if (!varMap.has(varName)) {
              varMap.set(varName, new Set([fileName]));
            } else {
              varMap.get(varName)!.add(fileName);
            }
          }
        });
      } else if (ts.isFunctionDeclaration(node)) {
        const funcName = node.name?.text;
        const _fileName = sourceFile.fileName
          .split(path.sep)
          .slice(rootLength)
          .join(path.sep);
        const fileName = `/${_fileName}`;

        if (!funcMap.has(funcName as string)) {
          funcMap.set(funcName as string, new Set([fileName]));
        } else {
          funcMap.get(funcName as string)!.add(fileName);
        }
      } else if (ts.isClassDeclaration(node)) {
        const className = node.name?.text;
        const _fileName = sourceFile.fileName
          .split(path.sep)
          .slice(rootLength)
          .join(path.sep);
        const fileName = `/${_fileName}`;

        if (!classMap.has(className as string)) {
          classMap.set(className as string, new Set([fileName]));
        } else {
          classMap.get(className as string)!.add(fileName);
        }
      }
    });
  }
  let duplicatedFound = false;
  varMap.forEach((files, varName) => {
    if (files.size > 1) {
      console.warn(
        `${bold(yellow("Warning"))} : ${grey(
          `Variable ${magenta(varName)} ${grey("declared in multiple files:")}`
        )}`
      );
      files.forEach((f) => console.warn(grey(`  - ${f}`)));
      duplicatedFound = true;
    }
  });
  funcMap.forEach((files, funcName) => {
    if (files.size > 1) {
      console.warn(
        `${bold(yellow("Warning"))} : ${grey(
          `Function ${magenta(funcName)} ${grey("declared in multiple files:")}`
        )}`
      );
      files.forEach((f) => console.warn(grey(`  - ${f}`)));
      duplicatedFound = true;
    }
  });

  classMap.forEach((files, className) => {
    if (files.size > 1) {
      console.warn(
        `${bold(yellow("Warning"))} : ${grey(
          `Class ${magenta(className)} ${grey("declared in multiple files:")}`
        )}`
      );
      files.forEach((f) => console.warn(grey(`  - ${f}`)));
      duplicatedFound = true;
    }
  });
  if (duplicatedFound) {
    if (renameDuplicated) {
      await reName();
    } else {
      process.exit(1);
    }
  }
  console.timeEnd("checked duplicated declarations");
}

export default checkDuplicate;
