import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import TreeView from './TreeView';
import { getSubtreeNodeIds, isLevelSolved } from '../utils/treeUtils';
import { fetchLevelById } from '../utils/api';
import {
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  RotateCcw,
  Trophy,
  Zap,
} from 'lucide-react';

export default function GameBoard({ levelId, onBack, onLevelComplete }) {
  const [levelData, setLevelData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // All game state
  const [currentColors, setCurrentColors] = useState({});
  const [moveCount, setMoveCount]       = useState(0);
  const [specialMoves, setSpecialMoves]  = useState(3);
  const [specialActive, setSpecialActive] = useState(false);
  const [won, setWon]                   = useState(false);
  const [history, setHistory]            = useState([]);

  // ── Load level from API ─────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    fetchLevelById(levelId)
      .then(data => {
        if (!alive) return;
        setLevelData(data);

        // All nodes start as Red (per game rules)
        const initColors = {};
        Object.keys(data.tree).forEach(id => { initColors[id] = 'red'; });
        setCurrentColors(initColors);
        setMoveCount(0);
        setSpecialMoves(3);
        setSpecialActive(false);
        setWon(false);
        setHistory([]);
        setLoading(false);
      })
      .catch(err => {
        if (!alive) return;
        setError(err.message || 'Failed to load level');
        setLoading(false);
      });

    return () => { alive = false; };
  }, [levelId]);

  // ── Victory check ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!levelData || loading || won) return;
    if (Object.keys(currentColors).length === 0) return;

    if (isLevelSolved(currentColors, levelData.targetColors)) {
      setWon(true);
      onLevelComplete(levelId);
      try { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); } catch {}
    }
  }, [currentColors, levelData, won, levelId, onLevelComplete, loading]);

  // ── Node click handler ──────────────────────────────────────────────────
  const handleNodeClick = useCallback((id) => {
    if (won || !levelData) return;

    // Push history snapshot
    setHistory(prev => [...prev, { colors: { ...currentColors }, specialMoves, moveCount }]);

    if (specialActive && specialMoves > 0) {
      // ✨ Special move: flip ONLY this node
      setCurrentColors(prev => ({
        ...prev,
        [id]: prev[id] === 'red' ? 'blue' : 'red',
      }));
      setSpecialMoves(m => m - 1);
      setSpecialActive(false);
      setMoveCount(m => m + 1);
    } else {
      // Standard move: flip entire subtree
      const subtree = getSubtreeNodeIds(id, levelData.tree);
      setCurrentColors(prev => {
        const next = { ...prev };
        subtree.forEach(nid => {
          next[nid] = next[nid] === 'red' ? 'blue' : 'red';
        });
        return next;
      });
      setMoveCount(m => m + 1);
    }
  }, [won, levelData, currentColors, specialActive, specialMoves, moveCount]);

  // ── Undo / Reset ────────────────────────────────────────────────────────
  const handleUndo = () => {
    if (!history.length || won) return;
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setCurrentColors(last.colors);
    setSpecialMoves(last.specialMoves);
    setMoveCount(last.moveCount);
  };

  const handleReset = () => {
    if (!levelData) return;
    const initColors = {};
    Object.keys(levelData.tree).forEach(id => { initColors[id] = 'red'; });
    setCurrentColors(initColors);
    setMoveCount(0);
    setSpecialMoves(3);
    setSpecialActive(false);
    setWon(false);
    setHistory([]);
  };

  // ── Render guards ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Summoning tree nodes…</p>
      </div>
    );
  }
  if (error || !levelData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-slate-900 border border-red-900/50 rounded-2xl max-w-md mx-auto">
        <HelpCircle className="w-8 h-8 text-red-400 mb-3" />
        <p className="text-sm text-slate-400 mb-5">{error || 'Unknown error'}</p>
        <button onClick={onBack} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition">
          Back to Levels
        </button>
      </div>
    );
  }

  const { tree, rootId, targetColors, name } = levelData;

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-2 text-sm font-medium border border-slate-700/50">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Levels</span>
          </button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {name}
              {won && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Solved!
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">Flip subtrees (or use single flips) to match the target.</p>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3">
          {/* Move counter */}
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Moves</span>
            <span className="text-lg font-extrabold text-indigo-400 font-mono">{moveCount}</span>
          </div>

          {/* Special move toggle */}
          <button
            onClick={() => setSpecialActive(a => !a)}
            disabled={specialMoves === 0 || won}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition border ${
              specialActive
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30 animate-pulse'
                : specialMoves > 0
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30 hover:border-amber-400/60'
                : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-50'
            }`}
          >
            <Zap className={`w-4 h-4 ${specialActive ? 'fill-slate-950' : 'fill-amber-400 text-amber-400'}`} />
            Single Flip
            <span className={`px-1.5 py-0.5 rounded-md text-xs font-mono ${specialActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-950 text-amber-300'}`}>
              {specialMoves}/3
            </span>
          </button>

          {/* Undo */}
          <button onClick={handleUndo} disabled={!history.length || won}
            title="Undo"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700/50">
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Reset */}
          <button onClick={handleReset} title="Reset"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-rose-300 hover:text-rose-200 transition border border-slate-700/50">
            <RotateCcw className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </div>

      {/* Special mode banner */}
      {specialActive && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl px-4 py-2.5 flex items-center justify-between text-amber-200 text-xs font-medium">
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
            <strong>Single-Flip Active:</strong> next click flips only that node.
          </span>
          <button onClick={() => setSpecialActive(false)} className="text-amber-400 hover:text-amber-300 underline font-semibold ml-4">
            Cancel
          </button>
        </div>
      )}

      {/* Dual tree board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TreeView
          tree={tree}
          rootId={rootId}
          nodeColors={targetColors}
          title="Target Tree"
          subtitle="Match your colors to look exactly like this"
          isInteractive={false}
        />
        <TreeView
          tree={tree}
          rootId={rootId}
          nodeColors={currentColors}
          onNodeClick={handleNodeClick}
          title="Current Tree"
          subtitle={
            specialActive
              ? '🎯 SINGLE-FLIP: click any node to flip only it'
              : '👆 STANDARD: click any node to flip its entire subtree'
          }
          isInteractive={!won}
        />
      </div>

      {/* Victory card */}
      {won && (
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border border-emerald-500/40 rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-white mb-1">Puzzle Solved! 🎉</h3>
          <p className="text-slate-300 text-sm max-w-md mx-auto mb-5">
            You matched the tree in <span className="text-emerald-400 font-bold font-mono">{moveCount}</span> moves!
          </p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={onBack}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/25 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> More Levels
            </button>
            <button onClick={handleReset}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition">
              Replay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
