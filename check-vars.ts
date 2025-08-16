import ts from "typescript";

function checkDuplicateDeclarations(filePaths: string[]) {
  const varMap = new Map<string, Set<string>>();
  const funcMap = new Map<string, Set<string>>();
  const classMap = new Map<string, Set<string>>();

  const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists);

  if (!configPath) throw new Error("Could not find tsconfig.json");

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const compilerOptions = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    process.cwd()
  );

  const program = ts.createProgram(filePaths, compilerOptions.options);

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach((decl) => {
          if (ts.isIdentifier(decl.name)) {
            const varName = decl.name.text;
            const fileName = sourceFile.fileName;

            if (!varMap.has(varName)) {
              varMap.set(varName, new Set([fileName]));
            } else {
              varMap.get(varName)!.add(fileName);
            }
          }
        });
      } else if (ts.isFunctionDeclaration(node)) {
        const funcName = node.name?.text;
        const fileName = sourceFile.fileName;

        if (!funcMap.has(funcName as string)) {
          funcMap.set(funcName as string, new Set([fileName]));
        } else {
          funcMap.get(funcName as string)!.add(fileName);
        }
      } else if (ts.isClassDeclaration(node)) {
        const className = node.name?.text;
        const fileName = sourceFile.fileName;

        if (!classMap.has(className as string)) {
          classMap.set(className as string, new Set([fileName]));
        } else {
          classMap.get(className as string)!.add(fileName);
        }
      }
    });
  }

  varMap.forEach((files, varName) => {
    if (files.size > 1) {
      console.warn(
        `Warning: Variable "${varName}" declared in multiple files:`
      );
      files.forEach((f) => console.warn(`  - ${f}`));
    }
  });
  funcMap.forEach((files, funcName) => {
    if (files.size > 1) {
      console.warn(
        `Warning: Function "${funcName}" declared in multiple files:`
      );
      files.forEach((f) => console.warn(`  - ${f}`));
    }
  });

  classMap.forEach((files, className) => {
    if (files.size > 1) {
      console.warn(`Warning: Class "${className}" declared in multiple files:`);
      files.forEach((f) => console.warn(`  - ${f}`));
    }
  });
}

// Usage
//checkDuplicateVars("./.notes/text");
export default checkDuplicateDeclarations;
