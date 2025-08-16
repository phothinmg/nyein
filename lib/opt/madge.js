import madge from "madge";
import path from "node:path";
/**
 * Topological sort of a directed acyclic graph (DAG).
 *
 * Takes a JavaScript object representing a graph where the values are arrays of
 * the nodes' dependencies. Returns a list of nodes in topological order.
 * @param {Object<string, string[]>} tree - The graph to be sorted.
 * @returns {string[]} - The nodes in topological order.
 */
function topoSort(tree) {
    const visited = new Set();
    const sorted = [];
    function visit(node) {
        if (visited.has(node))
            return;
        visited.add(node);
        (tree[node] || []).forEach(visit);
        sorted.push(node);
    }
    Object.keys(tree).forEach(visit);
    return sorted; // reverse for correct order
}
/**
 * Analyze the dependencies of a given JavaScript/TypeScript file or directory.
 */
async function getDependenciesInfo(entry) {
    const root = process.cwd();
    const dirName = path.dirname(entry);
    const _madge = await madge(entry);
    const _dag = _madge.obj();
    const warn = _madge.warnings();
    const circularGraph = _madge.circularGraph();
    const daGraph = topoSort(_dag).map((i) => path.join(root, dirName, i));
    return {
        warn,
        circularGraph,
        daGraph,
    };
}
export default getDependenciesInfo;
