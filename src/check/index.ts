import checkDuplicateDeclarations from "./check_declare.js";
import checkFiles from "./files_check.js";
import getCompilerOptions from "./get_options.js";
import typeCheckFromFile from "./type_check.js";

//
const checks = {
	checkDuplicateDeclarations,
	typeCheckFromFile,
	getCompilerOptions,
	checkFiles,
};

export default checks;
