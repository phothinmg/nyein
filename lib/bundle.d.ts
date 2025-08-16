import ts from "typescript";
export interface BundleOptions {
    /**
     * `path/to/entry_file`
     */
    entry: string;
    /**
     * Output directory
     */
    outDir: string;
    /**
     * Types check and check for duplicate declarations
     *
     * @default true
     */
    check?: boolean;
    /**
     * If `options.check` true , when error exit process or not.
     *
     * @default true
     */
    exit?: boolean;
    /**
     * Typescript compiler options or custom tsconfig path.
     *
     * Priority :
     *  - custom tsconfig path from options.compileOptsOrPath
     *  - tsconfig.json from project root
     *  - Typescript compiler options from options.compileOptsOrPath
     */
    compileOptsOrPath?: string | ts.CompilerOptions;
    write?: boolean;
}
export default function bundle({ entry, outDir, check, exit, compileOptsOrPath, write, }: BundleOptions): Promise<{
    out_file: string;
    finalContent: string;
}>;
