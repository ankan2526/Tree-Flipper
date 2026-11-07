import React, { useMemo } from 'react';
import { calculateLayout } from '../utils/treeUtils';

/**
 * TreeView — renders an SVG tree from the flat-map tree structure.
 *
 * Props:
 *   tree          { [nodeId]: { id, children, parentId } }
 *   rootId        string
 *   nodeColors    { [nodeId]: 'red' | 'blue' }
 *   onNodeClick   (nodeId: string) => void
 *   title / subtitle  strings shown above the canvas
 *   isInteractive bool
 *   width / height  SVG viewBox dimensions
 */
export default function TreeView({
  tree,
  rootId,
  nodeColors,
  onNodeClick,
  title,
  subtitle,
  isInteractive = false,
  width = 500,
  height = 420,
}) {
  const layout = useMemo(
    () => calculateLayout(tree, rootId, width, height, 40),
    [tree, rootId, width, height]
  );

  if (!tree || !rootId) return null;
  const nodeIds = Object.keys(tree);

  return (
    <div className="flex flex-col items-center bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:border-slate-700">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-3 px-2">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            {title}
            {isInteractive && (
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Playable
              </span>
            )}
          </h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full aspect-square max-w-[480px] bg-slate-950/70 rounded-xl border border-slate-800/80 flex items-center justify-center p-2 relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
          <defs>
            <radialGradient id="glowRed" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="70%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </radialGradient>
            <radialGradient id="glowBlue" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="70%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>
            <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Edges — iterate nodes, draw a line to each child */}
          <g>
            {nodeIds.map(id => {
              const node = tree[id];
              const p1 = layout[id];
              if (!p1) return null;
              return (node.children || []).map(childId => {
                const p2 = layout[childId];
                if (!p2) return null;
                return (
                  <line
                    key={`${id}-${childId}`}
                    x1={p1.x} y1={p1.y}
                    x2={p2.x} y2={p2.y}
                    stroke="#475569"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                );
              });
            })}
          </g>

          {/* Nodes */}
          <g>
            {nodeIds.map(id => {
              const pos = layout[id];
              if (!pos) return null;
              const color = nodeColors?.[id] || 'red';
              const isBlue = color === 'blue';
              const isRoot = id === rootId;

              return (
                <g
                  key={id}
                  transform={`translate(${pos.x},${pos.y})`}
                  onClick={() => isInteractive && onNodeClick?.(id)}
                  className={isInteractive ? 'cursor-pointer group' : 'cursor-default'}
                >
                  {/* Dashed ring on root node */}
                  {isRoot && (
                    <circle r={30} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" opacity={0.6} />
                  )}

                  {/* Node body */}
                  <circle
                    r={20}
                    fill={isBlue ? 'url(#glowBlue)' : 'url(#glowRed)'}
                    stroke={isBlue ? '#93c5fd' : '#fca5a5'}
                    strokeWidth="3"
                    filter="url(#nodeShadow)"
                    className="transition-all duration-300"
                  />

                  {/* Shine highlight */}
                  <circle cx={-6} cy={-6} r={6} fill="white" opacity={0.25} pointerEvents="none" />

                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-2 right-3 flex items-center gap-3 text-[11px] text-slate-400 font-mono bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-800">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Red
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Blue
          </span>
        </div>
      </div>
    </div>
  );
}
