import React, { useState, useEffect } from 'react';
import LevelSelect from './components/LevelSelect';
import GameBoard from './components/GameBoard';
import AdminDashboard from './components/AdminDashboard';
import { ShieldCheck, Trees, Sparkles, BookOpen } from 'lucide-react';

const STORAGE_KEY = 'tree_flipper_completed_levels';

export default function App() {
  const [currentView, setCurrentView] = useState('levels'); // 'levels' | 'game' | 'admin'
  const [selectedLevelId, setSelectedLevelId] = useState(null);
  const [completedLevels, setCompletedLevels] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist progress to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completedLevels));
    } catch (e) {
      console.error('Failed to save progress to localStorage', e);
    }
  }, [completedLevels]);

  const handleSelectLevel = (levelId) => {
    setSelectedLevelId(levelId);
    setCurrentView('game');
  };

  const handleLevelComplete = (levelId) => {
    setCompletedLevels(prev => {
      if (!prev.includes(levelId)) {
        return [...prev, levelId];
      }
      return prev;
    });
  };

  const handleClearProgress = () => {
    if (window.confirm("Reset all your completed level progress?")) {
      setCompletedLevels([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Global Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            onClick={() => setCurrentView('levels')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Trees className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                TreeFlipper
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                v1.0 Zero-Tier
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('levels')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'levels' || currentView === 'game'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Play
            </button>

            <button
              onClick={() => setCurrentView('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                currentView === 'admin'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {currentView === 'levels' && (
          <LevelSelect
            onSelectLevel={handleSelectLevel}
            completedLevels={completedLevels}
          />
        )}

        {currentView === 'game' && selectedLevelId && (
          <GameBoard
            levelId={selectedLevelId}
            onBack={() => setCurrentView('levels')}
            onLevelComplete={handleLevelComplete}
            isCompletedInitially={completedLevels.includes(selectedLevelId)}
          />
        )}

        {currentView === 'admin' && (
          <AdminDashboard
            onExit={() => setCurrentView('levels')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Tree Flipper • 100% Free Tier Architecture (Render + Neon DB)</p>
          {completedLevels.length > 0 && (
            <button
              onClick={handleClearProgress}
              className="text-slate-500 hover:text-rose-400 transition underline"
            >
              Reset Player Progress ({completedLevels.length} completed)
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

