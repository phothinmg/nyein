// cSpell:disable
import ts from "typescript";
import fs from "node:fs/promises";
import path from "node:path";

// ESM syntax ပဲတွေ့ရင် → 'esm', CommonJS syntax ပဲတွေ့ရင် → 'commonjs'
// နှစ်ခုလုံးတွေ့ရင် → 'esm' (ဘာလို့လဲဆိုတော့ ESM မှာ dynamic import အနေနဲ့ require ကိုသုံးလို့ရတယ်)
// ဘာမှမသိနိုင်ရင် → 'unknown'
/**
 * Checks if a given TypeScript/JavaScript file is using CommonJS or ESM module format
 * @param filePath Path to the file to check
 * @returns 'commonjs' | 'esm' | 'unknown'
 */
export async function checkModuleFormatFromFile(
  filePath: string
): Promise<"esm" | "commonjs" | "unknown" | undefined> {
  const root = process.cwd();
  const file_path = path.join(root, filePath);
  try {
    // Read the file content
    const fileContent = await fs.readFile(file_path, "utf-8");
    // Create a TypeScript source file
    const sourceFile = ts.createSourceFile(
      filePath,
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    let hasESMImports = false;
    let hasCommonJS = false;
    // Walk through the AST to detect module syntax
    function walk(node: ts.Node) {
      // Check for ESM import/export syntax
      if (
        ts.isImportDeclaration(node) ||
        ts.isExportDeclaration(node) ||
        ts.isImportEqualsDeclaration(node) ||
        (ts.isExportAssignment(node) && !!node.isExportEquals)
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
        if (text.startsWith("module.exports") || text.startsWith("exports.")) {
          hasCommonJS = true;
        }
      }

      // Continue walking the AST
      ts.forEachChild(node, walk);
    }
    walk(sourceFile);

    // Determine the module format based on what we found
    if (hasESMImports && !hasCommonJS) {
      return "esm";
    } else if (hasCommonJS && !hasESMImports) {
      return "commonjs";
    } else if (hasESMImports && hasCommonJS) {
      // Mixed - probably ESM with dynamic imports or similar
      return "esm";
    }
  } catch (error) {
    console.error(`Error checking module format for ${filePath}:`, error);
    return "unknown";
  }
}

/**
 * Given an array of file paths, determine the module format of the files by checking each file
 * individually with checkModuleFormatFromFile.
 *
 * If all files are ESM, returns "esm".
 * If all files are CommonJS, returns "commonjs".
 * If there is a mix of ESM and CommonJS files, returns "mixed".
 * If any of the files could not be determined, returns "unknown".
 * If the input array is empty, returns undefined.
 * @param filePaths The array of file paths to check.
 */
export async function checkModuleFormatFromFileArray(
  filePaths: string[]
): Promise<"esm" | "commonjs" | "unknown" | "mixed" | undefined> {
  let esmCount = 0;
  let cjsCount = 0;
  let unknowCount = 0;
  let undefindedCount = 0;
  for await (const file of filePaths) {
    const moduleType = await checkModuleFormatFromFile(file);
    if (moduleType === "esm") esmCount++;
    if (moduleType === "commonjs") cjsCount++;
    if (moduleType === "unknown") unknowCount++;
    if (typeof moduleType === "undefined") undefindedCount++;
  }
  if (esmCount && !cjsCount && !unknowCount && !undefindedCount) {
    return "esm";
  } else if (!esmCount && cjsCount && !unknowCount && !undefindedCount) {
    return "commonjs";
  } else if (esmCount && cjsCount && !unknowCount && !undefindedCount) {
    return "mixed";
  } else if (unknowCount) {
    return "unknown";
  } else {
    return undefined;
  }
}
