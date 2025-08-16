import ts from "typescript";
import path from "node:path";
import { yellow, magenta, bold, grey } from "@lwe8/tcolor";
import getCompilerOptions from "./get_options.js";
function checkDuplicateDeclarations({ filePaths, exit = true, compileOptsOrPath = undefined, }) {
    const root = process.cwd();
    const rootLength = root.split(path.sep).length;
    const varMap = new Map();
    const funcMap = new Map();
    const classMap = new Map();
    const importMap = new Set();
    const compilerOptions = getCompilerOptions(compileOptsOrPath).getOptions();
    if (!compilerOptions) {
        throw new Error(magenta(`Could not find compiler options,you need to place "tsconfig.json" at root of your project or 
        defined custom tsconfig path or compiler options at "options.compileOptsOrPath".
        `));
    }
    const program = ts.createProgram(filePaths, compilerOptions);
    for (const sourceFile of program.getSourceFiles()) {
        if (sourceFile.isDeclarationFile)
            continue;
        ts.forEachChild(sourceFile, (node) => {
            if (ts.isVariableStatement(node)) {
                node.declarationList.declarations.forEach((decl) => {
                    if (decl.initializer &&
                        ts.isCallExpression(decl.initializer) &&
                        ts.isIdentifier(decl.initializer.expression) &&
                        decl.initializer.expression.escapedText === "require" &&
                        ts.isIdentifier(decl.name)) {
                        let varName = decl.name.text;
                        const m = /^\{([^}]*)\}/.exec(varName.trim());
                        if (m) {
                            varName = m[1];
                        }
                        importMap.add(varName);
                    }
                });
            }
        });
        ts.forEachChild(sourceFile, (node) => {
            if (ts.isVariableStatement(node)) {
                node.declarationList.declarations.forEach((decl) => {
                    if (ts.isIdentifier(decl.name)) {
                        const varName = decl.name.text;
                        const _fileName = sourceFile.fileName
                            .split(path.sep)
                            .slice(rootLength)
                            .join(path.sep);
                        const fileName = `/${_fileName}`;
                        if (!varMap.has(varName)) {
                            varMap.set(varName, new Set([fileName]));
                        }
                        else {
                            varMap.get(varName).add(fileName);
                        }
                    }
                });
            }
            else if (ts.isFunctionDeclaration(node)) {
                const funcName = node.name?.text;
                const _fileName = sourceFile.fileName
                    .split(path.sep)
                    .slice(rootLength)
                    .join(path.sep);
                const fileName = `/${_fileName}`;
                if (!funcMap.has(funcName)) {
                    funcMap.set(funcName, new Set([fileName]));
                }
                else {
                    funcMap.get(funcName).add(fileName);
                }
            }
            else if (ts.isClassDeclaration(node)) {
                const className = node.name?.text;
                const _fileName = sourceFile.fileName
                    .split(path.sep)
                    .slice(rootLength)
                    .join(path.sep);
                const fileName = `/${_fileName}`;
                if (!classMap.has(className)) {
                    classMap.set(className, new Set([fileName]));
                }
                else {
                    classMap.get(className).add(fileName);
                }
            }
        });
    }
    varMap.forEach((files, varName) => {
        if (files.size > 1 && !importMap.has(varName)) {
            console.warn(`${bold(yellow("Warning"))} : ${grey(`Variable ${magenta(varName)} ${grey("declared in multiple files:")}`)}`);
            files.forEach((f) => console.warn(grey(`  - ${f}`)));
            if (exit) {
                console.warn(magenta("Exit process with code:1"));
                process.exit(1);
            }
        }
    });
    funcMap.forEach((files, funcName) => {
        if (files.size > 1) {
            console.warn(`${bold(yellow("Warning"))} : ${grey(`Function ${magenta(funcName)} ${grey("declared in multiple files:")}`)}`);
            files.forEach((f) => console.warn(grey(`  - ${f}`)));
            if (exit) {
                console.warn(magenta("Exit process with code:1"));
                process.exit(1);
            }
        }
    });
    classMap.forEach((files, className) => {
        if (files.size > 1) {
            console.warn(`${bold(yellow("Warning"))} : ${grey(`Class ${magenta(className)} ${grey("declared in multiple files:")}`)}`);
            files.forEach((f) => console.warn(grey(`  - ${f}`)));
            if (exit) {
                console.warn(magenta("Exit process with code:1"));
                process.exit(1);
            }
        }
    });
}
export default checkDuplicateDeclarations;
