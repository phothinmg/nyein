// cSpell:disable
import ts from "typescript";
import fs from "node:fs/promises";
import path from "node:path";
import { magenta, yellow } from "@lwe8/tcolor";

const js_exts = [".js", ".mjs", ".cjs"];
const ts_exts = [".ts", ".mts", ".cts"];
const jsx_exts = [".jsx", ".tsx"];

/**
 * @param allFiles - Array of file paths
 * @returns "js" if all files have js extensions,
 *          "ts" if all files have ts extensions,
 *          "all" if all files have valid extensions (js or ts),
 *          "none" if not all files have valid extensions
 */
function checkExtGroup(allFiles: string[]): "js" | "ts" | "all" | "none" {
  const exts = allFiles.map((file) => {
    return path.extname(file);
  });
  const jsSet = new Set(js_exts);
  const tsSet = new Set(ts_exts);
  const jsxSet = new Set(jsx_exts);

  const allJs = exts.every((ext) => jsSet.has(ext));
  const allTs = exts.every((ext) => tsSet.has(ext));
  const allValid = exts.every(
    (ext) => jsSet.has(ext) || tsSet.has(ext) || jsxSet.has(ext)
  );

  if (allJs) return "js";
  if (allTs) return "ts";
  if (allValid) return "all";
  return "none";
}

/**
 * Checks the module format (ESM or CommonJS) of a TypeScript file.
 * @param filePath - Path to the file to check
 * @returns "esm" if the file uses ESM syntax, "commonjs" if it uses CommonJS syntax, or "unknown" if there is an error
 */
async function checkModuleFormatFromFile(filePath: string) {
  try {
    // Read the file content
    const fileContent = await fs.readFile(filePath, "utf-8");
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
        node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)
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
    console.error(
      magenta(`Error checking module format for ${filePath}:`),
      magenta(error)
    );
    return "unknown";
  }
}

/**
 * Given an array of file paths, determines the module format of the files by
 * calling `checkModuleFormatFromFile` on each file. If all files are ESM,
 * returns "esm". If all files are CommonJS, returns "commonjs". If there is a
 * mix of ESM and CommonJS files, returns "mixed". If there are files that are
 * unknown, returns "unknown". If the input array is empty, returns undefined.
 */
async function checkModuleFormatFromFileArray(
  allFiles: string[]
): Promise<"esm" | "commonjs" | "unknown" | "mixed" | undefined> {
  let esmCount = 0;
  let cjsCount = 0;
  let unknowCount = 0;
  let undefindedCount = 0;
  for await (const file of allFiles) {
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

/**
 * Check all files in the dependencies tree. It will check if all files has
 * the same file extension and module type. If there is a mix of file
 * extensions or module types, it will throw an error.
 * @param allFiles - An array of file paths.
 */
async function checkFiles(allFiles: string[]) {
  console.time("checked file's extensions and module types");
  const extGroup = checkExtGroup(allFiles);
  const moduleType = await checkModuleFormatFromFileArray(allFiles);
  if (extGroup === "none") {
    console.error(
      magenta(
        `Bundler detects an unsupported file extensions in the dependencies tree. `
      )
    );
    process.exit(1);
  }
  //TODO Extension Types: current version unsupported, try to support in future versions.
  if (extGroup === "all") {
    console.warn(
      magenta(
        "Bundler detects both JavaScript,TypeScript,JSX extensions(Mixed) in the dependencies tree, which is currently unsupported but will be supported in future versions"
      )
    );
    process.exit(1);
  }
  if (moduleType === "unknown") {
    console.warn(
      magenta(
        "Unknown error when checking module types in the dependencies tree,bundler error to fix."
      )
    );
    process.exit(1);
  }
  //TODO Module Format: current version support only ESM format, try to support Mixed ESM and CommonJs in future versions.
  if (moduleType === "mixed" || moduleType === "commonjs") {
    console.warn(
      magenta(
        "Bundler detects both ESM and CommonJs formats(Mixed) or CommonJs format  in the dependencies tree, bundler currently support only ESM module format but will be supported in future versions."
      )
    );
    process.exit(1);
  }
  console.timeEnd("checked file's extensions and module types");
}

export default checkFiles;
