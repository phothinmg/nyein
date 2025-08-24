import path from "node:path";
import { bold, grey, magenta, yellow } from "@lwe8/tcolor";
import ts from "typescript";
import $fnCompilerOptions from "../compiler_options.js";
import { wait } from "../helpers.js";

export interface CheckDuplicateDeclarations {
  filePaths: string[];
  customConfigPath?: string | undefined;
}

async function check_duplicate({
  filePaths,
  customConfigPath = undefined,
}: CheckDuplicateDeclarations) {
  const root = process.cwd();
  const rootLength = root.split(path.sep).length;
  const varMap = new Map<string, Set<string>>();
  const funcMap = new Map<string, Set<string>>();
  const classMap = new Map<string, Set<string>>();
  const compilerOptions = $fnCompilerOptions.get(customConfigPath);

  const program = ts.createProgram(filePaths, compilerOptions);

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
  let _err = false;
  varMap.forEach((files, varName) => {
    if (files.size > 1) {
      console.warn(
        `${bold(yellow("Warning"))} : ${grey(
          `Variable ${magenta(varName)} ${grey("declared in multiple files:")}`
        )}`
      );
      files.forEach((f) => console.warn(grey(`  - ${f}`)));
      _err = true;
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
      _err = true;
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
      _err = true;
    }
  });
  await wait(1000);
  if (_err) {
    //process.exit(1);
  }
}

export default check_duplicate;
