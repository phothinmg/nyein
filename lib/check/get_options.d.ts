import ts from "typescript";
declare class GetCompilerOptions {
    private _customConfigPath;
    private _compileOpts;
    private _root;
    private _configPath;
    constructor(compileOptsOrPath?: string | ts.CompilerOptions);
    private _getOptions;
    get forTypeCheck(): ts.CompilerOptions;
    forBundleDts(out_dir: string): ts.CompilerOptions;
    getOptions(tsconfig?: string): ts.CompilerOptions | undefined;
}
export default function getCompilerOptions(compileOptsOrPath?: string | ts.CompilerOptions): GetCompilerOptions;
export {};
