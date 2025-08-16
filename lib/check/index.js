import checkDuplicateDeclarations from "./check_declare.js";
import typeCheckFromFile from "./type_check.js";
import checkFiles from "./files_check.js";
import getCompilerOptions from "./get_options.js";
//
const checks = {
    checkDuplicateDeclarations,
    typeCheckFromFile,
    getCompilerOptions,
    checkFiles,
};
export default checks;
