import checkDuplicateDeclarations from "./check_declare.js";
import typeCheckFromFile from "./type_check.js";
import checkFiles from "./files_check.js";
import getCompilerOptions from "./get_options.js";
declare const checks: {
    checkDuplicateDeclarations: typeof checkDuplicateDeclarations;
    typeCheckFromFile: typeof typeCheckFromFile;
    getCompilerOptions: typeof getCompilerOptions;
    checkFiles: typeof checkFiles;
};
export default checks;
