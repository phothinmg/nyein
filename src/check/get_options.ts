import ts from "typescript";
import path from "node:path";
class GetCompilerOptions {
  private _customConfigPath: string | undefined;
  private _compileOpts: ts.CompilerOptions | undefined;
  private _root: string;
  private _configPath: string | undefined;

  constructor(compileOptsOrPath?: string | ts.CompilerOptions) {
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
  private _getOptions(): ts.CompilerOptions | undefined {
    if (this._customConfigPath) {
      const absoluteConfigPath = path.resolve(this._customConfigPath);
      const config = ts.readConfigFile(absoluteConfigPath, ts.sys.readFile);
      return ts.parseJsonConfigFileContent(
        config.config,
        ts.sys,
        path.dirname(absoluteConfigPath)
      ).options;
    } else if (this._configPath) {
      const configFile = ts.readConfigFile(this._configPath, ts.sys.readFile);
      return ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        this._root
      ).options;
    } else if (this._compileOpts) {
      return this._compileOpts;
    } else {
      return undefined;
    }
  }
  get forTypeCheck(): ts.CompilerOptions {
    let _options: ts.CompilerOptions = { noEmit: true, strict: true };
    if (this._getOptions()) {
      const { noEmit, strict, ...rest } =
        this._getOptions() as ts.CompilerOptions;
      _options = { noEmit: true, strict: true, ...rest };
    }
    return _options;
  }
  forBundleDts(out_dir: string): ts.CompilerOptions {
    let _options: ts.CompilerOptions = {
      declaration: true,
      emitDeclarationOnly: true,
      outDir: out_dir,
    };
    if (this._getOptions()) {
      const { declaration, emitDeclarationOnly, outDir, ...rest } =
        this._getOptions() as ts.CompilerOptions;
      _options = {
        declaration: true,
        emitDeclarationOnly: true,
        outDir: out_dir,
        ...rest,
      };
    }
    return _options;
  }
  forNpmCompile(out_dir: string, _module: ts.ModuleKind, tsconfig?: string) {
    if (tsconfig) {
      this._customConfigPath = tsconfig;
    }
    //let _options:ts.CompilerOptions = {};
    if (this._getOptions()) {
      const { outDir, module, moduleResolution, declaration, ...rest } =
        this._getOptions() as ts.CompilerOptions;
      return {
        outDir: out_dir,
        module: _module,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        declaration: true,
        ...rest,
      } as ts.CompilerOptions;
    }
  }
  getOptionsForCheckVars() {
    return this._getOptions();
  }
}

export default function getCompilerOptions(
  compileOptsOrPath?: string | ts.CompilerOptions
) {
  return new GetCompilerOptions(compileOptsOrPath);
}
