import React, { useState, useEffect } from 'react';
import { fetchLevels, getCachedLevels } from '../utils/api';
import { CheckCircle2, Play, Lock, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

export default function LevelSelect({ onSelectLevel, completedLevels = [] }) {
  const [levels, setLevels] = useState(() => getCachedLevels() ?? []);
  const [hasCachedLevels, setHasCachedLevels] = useState(() => getCachedLevels() !== null);
  const [loading, setLoading] = useState(() => getCachedLevels() === null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadLevels = async () => {
    try {
      if (!hasCachedLevels) setLoading(true);
      else setRefreshing(true);
      setError(null);
      const data = await fetchLevels();
      setLevels(data);
      setHasCachedLevels(true);
    } catch (err) {
      setError(err.message || 'Unable to connect to game database');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLevels();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero / Intro */}
      <div className="text-center space-y-3 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide">
          <Sparkles className="w-3.5 h-3.5" /> Zero-Dollar Full-Stack Puzzle
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          Tree <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-purple-400 to-blue-500">Flipper</span>
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
          Flip nodes and subtrees to match the mysterious target pattern.
          Strategize with recursive chain reactions and save your single flips wisely.
        </p>
      </div>

      {/* Progress Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        <div>
          <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Your Progress</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {completedLevels.length}
            </span>
            <span className="text-slate-500 font-medium text-sm">/ {levels.length || 0} Levels Solved</span>
          </div>
        </div>

        <button
          onClick={loadLevels}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
          title="Refresh levels"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading || refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Levels Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400 font-medium text-sm">Fetching levels from database...</p>
        </div>
      ) : error && !hasCachedLevels ? (
        <div className="p-6 bg-red-950/40 border border-red-900/60 rounded-2xl text-center max-w-md mx-auto space-y-4">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-red-200 text-sm font-medium">{error}</p>
          <button
            onClick={loadLevels}
            className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition"
          >
            Retry Connection
          </button>
        </div>
      ) : levels.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
          <p className="text-slate-400 text-sm">No levels found in database yet.</p>
          <p className="text-xs text-slate-500 mt-1">Use the Admin portal to create and publish levels!</p>
        </div>
      ) : (
        <>
          {error && (
            <p className="text-center text-xs text-amber-300">
              Showing saved levels; refresh failed: {error}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {levels.map(lvl => {
              const isCompleted = completedLevels.includes(lvl.id);

              return (
                <div
                  key={lvl.id}
                  onClick={() => onSelectLevel(lvl.id)}
                  className={`group relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                    isCompleted
                      ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10'
                      : 'bg-slate-900/50 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60 hover:shadow-xl hover:shadow-indigo-500/5'
                  }`}
                >
                  {/* Completion Badge */}
                  {isCompleted && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Done</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-mono font-bold text-base text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                      {lvl.level_number}
                    </div>

                    <div>
                      <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors">
                        {lvl.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {lvl.node_count} nodes in tree
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500 font-mono">ID: {lvl.id}</span>
                      <span className="flex items-center gap-1 text-indigo-400 group-hover:translate-x-1 transition-transform">
                        Play <Play className="w-3 h-3 fill-indigo-400" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
