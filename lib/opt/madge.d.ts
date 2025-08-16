import madge from "madge";
/**
 * Analyze the dependencies of a given JavaScript/TypeScript file or directory.
 */
declare function getDependenciesInfo(entry: string): Promise<{
    warn: madge.MadgeWarnings;
    circularGraph: madge.MadgeModuleDependencyGraph;
    daGraph: string[];
}>;
export default getDependenciesInfo;
