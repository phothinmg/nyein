import path from "node:path";
import madge from "madge";

/**
 * Topological sort of a directed acyclic graph (DAG).
 *
 * Takes a JavaScript object representing a graph where the values are arrays of
 * the nodes' dependencies. Returns a list of nodes in topological order.
 * @param {Object<string, string[]>} tree - The graph to be sorted.
 * @returns {string[]} - The nodes in topological order.
 */
function topoSort(tree: Record<string, string[]>): string[] {
  const visited = new Set();
  const sorted: string[] = [];
  function visit(node: string) {
    if (visited.has(node)) return;
    visited.add(node);
    (tree[node] || []).forEach(visit);
    sorted.push(node);
  }
  Object.keys(tree).forEach(visit);
  return sorted; // reverse for correct order
}

/**
 * Get dependencies information from a given entry file.
 *
 * Returns an object containing
 * @property {madge.MadgeWarnings} warn - The warnings from madge.
 * @property {madge.MadgeModuleDependencyGraph} circularGraph - The circular
 *   graph from madge.
 * @property {string[]} daGraph - The nodes in the graph in topological order.
 *
 * @param {string} entry - The path to the entry file.
 * @returns {Promise<{warn: madge.MadgeWarnings, circularGraph: madge.MadgeModuleDependencyGraph, daGraph: string[]}>}
 */
async function getDependenciesInfo(entry: string): Promise<{
  warn: madge.MadgeWarnings;
  circularGraph: madge.MadgeModuleDependencyGraph;
  daGraph: string[];
}> {
  console.time("processed dependencies from entry");
  const root = process.cwd();
  const dirName = path.dirname(entry);
  const _madge = await madge(entry);
  const _dag = _madge.obj();
  const warn: madge.MadgeWarnings = _madge.warnings();
  const circularGraph: madge.MadgeModuleDependencyGraph =
    _madge.circularGraph();
  const daGraph: string[] = topoSort(_dag).map((i) =>
    path.join(root, dirName, i)
  );
  console.timeEnd("processed dependencies from entry");
  return {
    warn,
    circularGraph,
    daGraph,
  };
}
export default getDependenciesInfo;
