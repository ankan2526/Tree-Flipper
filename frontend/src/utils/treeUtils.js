/**
 * Tree Layout and Game Logic Utilities
 *
 * Tree format: flat map  { nodeId: { id, children: string[], parentId: string|null } }
 */

/**
 * Calculates physical (x, y) coordinates for every node in the tree.
 * Uses a leaf-distribution algorithm: leaves are spread evenly, parents
 * are centred over their children — identical to the reference implementation.
 *
 * @param {Object} treeStructure  - { nodeId: { id, children, parentId } }
 * @param {string} rootId
 * @param {number} width          - SVG viewBox width
 * @param {number} height         - SVG viewBox height
 * @param {number} padding
 * @returns {{ [nodeId: string]: { x: number, y: number } }}
 */
export function calculateLayout(treeStructure, rootId, width = 500, height = 500, padding = 40) {
  if (!treeStructure || !rootId || !treeStructure[rootId]) return {};

  const nodes = {};
  const depths = {};
  let maxDepth = 0;

  // 1. BFS/DFS to record depth of every node
  function computeDepth(id, d) {
    depths[id] = d;
    maxDepth = Math.max(maxDepth, d);
    (treeStructure[id]?.children || []).forEach(c => {
      if (treeStructure[c]) computeDepth(c, d + 1);
    });
  }
  computeDepth(rootId, 0);

  // 2. Count and index leaves (left → right)
  let leafCount = 0;
  const leafXs = {};
  function countLeaves(id) {
    const children = treeStructure[id]?.children || [];
    if (children.length === 0) {
      leafXs[id] = leafCount++;
      return 1;
    }
    let leaves = 0;
    children.forEach(c => {
      if (treeStructure[c]) leaves += countLeaves(c);
    });
    return leaves;
  }
  const totalLeaves = countLeaves(rootId);

  // 3. Assign logical X (average of children) then physical coords
  function assignCoords(id) {
    const children = treeStructure[id]?.children || [];
    let logicalX;
    if (children.length === 0) {
      logicalX = leafXs[id];
    } else {
      let sumX = 0;
      children.forEach(c => {
        if (treeStructure[c]) {
          assignCoords(c);
          sumX += nodes[c].logicalX;
        }
      });
      logicalX = sumX / children.length;
    }
    nodes[id] = { logicalX, d: depths[id] };
  }
  assignCoords(rootId);

  const usableWidth = width - 2 * padding;
  const usableHeight = height - 2 * padding;
  const out = {};
  Object.keys(nodes).forEach(id => {
    const nx =
      totalLeaves <= 1
        ? width / 2
        : padding + (nodes[id].logicalX / (totalLeaves - 1)) * usableWidth;
    const ny =
      maxDepth === 0
        ? height / 2
        : padding + (nodes[id].d / maxDepth) * usableHeight;
    out[id] = { x: nx, y: ny };
  });
  return out;
}

/**
 * Returns array of node IDs in the subtree rooted at targetNodeId (inclusive).
 * Uses the flat-map tree structure.
 */
export function getSubtreeNodeIds(targetNodeId, tree) {
  const result = [];
  function dfs(id) {
    if (!tree[id]) return;
    result.push(id);
    (tree[id].children || []).forEach(childId => dfs(childId));
  }
  dfs(targetNodeId);
  return result;
}

/**
 * Returns true when every node in targetColors matches currentColors.
 */
export function isLevelSolved(currentColors, targetColors) {
  if (!currentColors || !targetColors) return false;
  return Object.keys(targetColors).every(id => currentColors[id] === targetColors[id]);
}

/** Lightweight random ID generator (matches reference implementation). */
export const generateId = () => Math.random().toString(36).substring(2, 10);
