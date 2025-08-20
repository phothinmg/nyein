import checkFiles from "./files/index.js";
import typesCheck from "./tsc/types.js";
import checkDuplicateDeclarations from "./tsc/check_declare.js";

const Checks = {
  checkFiles,
  typesCheck,
  checkDuplicateDeclarations,
};

export default Checks;
