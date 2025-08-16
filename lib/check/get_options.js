import ts from "typescript";
import path from "node:path";
class GetCompilerOptions {
    constructor(compileOptsOrPath) {
        this._customConfigPath =
            compileOptsOrPath && typeof compileOptsOrPath === "string"
                ? compileOptsOrPath
                : undefined;
        this._compileOpts =
            compileOptsOrPath && typeof compileOptsOrPath !== "string"
                ? compileOptsOrPath
                : undefined;
        this._root = process.cwd();
        this._configPath = ts.findConfigFile(this._root, ts.sys.fileExists);
    }
    _getOptions() {
        if (this._customConfigPath) {
            const absoluteConfigPath = path.resolve(this._customConfigPath);
            const config = ts.readConfigFile(absoluteConfigPath, ts.sys.readFile);
            return ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(absoluteConfigPath)).options;
        }
        else if (this._configPath) {
            const configFile = ts.readConfigFile(this._configPath, ts.sys.readFile);
            return ts.parseJsonConfigFileContent(configFile.config, ts.sys, this._root).options;
        }
        else if (this._compileOpts) {
            return this._compileOpts;
        }
        else {
            return undefined;
        }
    }
    get forTypeCheck() {
        let _options = { noEmit: true, strict: true };
        if (this._getOptions()) {
            const { noEmit, strict, ...rest } = this._getOptions();
            _options = { noEmit: true, strict: true, ...rest };
        }
        return _options;
    }
    forBundleDts(out_dir) {
        let _options = {
            declaration: true,
            emitDeclarationOnly: true,
            outDir: out_dir,
        };
        if (this._getOptions()) {
            const { declaration, emitDeclarationOnly, outDir, ...rest } = this._getOptions();
            _options = {
                declaration: true,
                emitDeclarationOnly: true,
                outDir: out_dir,
                ...rest,
            };
        }
        return _options;
    }
    getOptions(tsconfig) {
        if (tsconfig) {
            this._customConfigPath = tsconfig;
        }
        return this._getOptions();
    }
}
export default function getCompilerOptions(compileOptsOrPath) {
    return new GetCompilerOptions(compileOptsOrPath);
}
