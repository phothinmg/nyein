import ts from "typescript";
export interface TypeCheckOptions {
    filePaths: string[];
    exit?: boolean;
    compileOptsOrPath?: string | ts.CompilerOptions;
}
export default function typeCheckFromFile({ filePaths, exit, compileOptsOrPath, }: TypeCheckOptions): void;
