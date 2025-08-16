import ts from "typescript";
export interface CheckDuplicateDeclarations {
    filePaths: string[];
    exit: boolean;
    compileOptsOrPath?: string | ts.CompilerOptions;
}
declare function checkDuplicateDeclarations({ filePaths, exit, compileOptsOrPath, }: CheckDuplicateDeclarations): void;
export default checkDuplicateDeclarations;
