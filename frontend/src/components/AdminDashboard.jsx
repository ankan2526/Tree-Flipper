import React, { useState, useEffect } from 'react';
import {
  fetchLevels,
  fetchLevelById,
  createLevel,
  updateLevel,
  deleteLevel,
  verifyAdminKey,
} from '../utils/api';
import TreeView from './TreeView';
import { generateId } from '../utils/treeUtils';
import {
  Edit,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';

// ── Defaults for the Level Editor ──────────────────────────────────────────
const INITIAL_TREE = {
  root: { id: 'root', children: [], parentId: null },
};
const INITIAL_COLORS = { root: 'blue' };

// ── Admin Dashboard ─────────────────────────────────────────────────────────
export default function AdminDashboard({ onExit }) {
  const [adminKey, setAdminKey]           = useState(() => localStorage.getItem('tf_admin_key') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [levels, setLevels]               = useState([]);
  const [loading, setLoading]             = useState(false);
  const [statusMsg, setStatusMsg]         = useState(null);

  // Editor state
  const [isEditing, setIsEditing]         = useState(false);
  const [editingId, setEditingId]         = useState(null);   // null ⇒ Create
  const [formName, setFormName]           = useState('');
  const [formLevelNumber, setFormLevelNumber] = useState('0');
  const [formTree, setFormTree]           = useState(INITIAL_TREE);
  const [formColors, setFormColors]       = useState(INITIAL_COLORS);
  const [editorMode, setEditorMode]       = useState('add');  // 'add' | 'color'

  // ── Auth ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    const key = adminKey.trim();
    if (!key) return;

    try {
      setAuthenticating(true);
      setStatusMsg(null);
      await verifyAdminKey(key);
      localStorage.setItem('tf_admin_key', key);
      setAdminKey(key);
      setIsAuthenticated(true);
      await loadLevels();
    } catch (err) {
      if (err.status === 401) {
        localStorage.removeItem('tf_admin_key');
        setIsAuthenticated(false);
      }
      setStatusMsg({
        type: 'error',
        text: err.status === 401
          ? 'Invalid Admin Key. Please try again.'
          : err.message || 'Unable to verify Admin Key.',
      });
    } finally {
      setAuthenticating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tf_admin_key');
    setIsAuthenticated(false);
    setAdminKey('');
    setStatusMsg(null);
  };

  // Revalidate a cached key with the backend before restoring the admin session.
  useEffect(() => {
    let cancelled = false;
    const cachedKey = localStorage.getItem('tf_admin_key')?.trim();
    if (!cachedKey) return () => { cancelled = true; };

    setAdminKey(cachedKey);
    setAuthenticating(true);
    verifyAdminKey(cachedKey)
      .then(async () => {
        if (cancelled) return;
        setIsAuthenticated(true);
        await loadLevels();
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.status === 401) {
          localStorage.removeItem('tf_admin_key');
          setAdminKey('');
        }
        setIsAuthenticated(false);
        setStatusMsg({
          type: 'error',
          text: err.status === 401
            ? 'Saved Admin Key is invalid. Please enter the current key.'
            : 'Unable to verify the saved Admin Key. Please try again.',
        });
      })
      .finally(() => {
        if (!cancelled) setAuthenticating(false);
      });

    return () => { cancelled = true; };
  }, []);     // eslint-disable-line react-hooks/exhaustive-deps

  // ── Level list ────────────────────────────────────────────────────────────
  const loadLevels = async () => {
    try {
      setLoading(true);
      setStatusMsg(null);
      setLevels(await fetchLevels());
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to fetch levels' });
    } finally {
      setLoading(false);
    }
  };

  // ── Open Create / Edit ────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setFormName('New Level');
    setFormLevelNumber(String(
      levels.reduce((max, level) => Math.max(max, level.level_number ?? 0), -1) + 1
    ));
    setFormTree(INITIAL_TREE);
    setFormColors(INITIAL_COLORS);
    setEditorMode('add');
    setIsEditing(true);
  };

  const openEdit = async (lvlId) => {
    try {
      setLoading(true);
      const full = await fetchLevelById(lvlId);
      setEditingId(lvlId);
      setFormName(full.name);
      setFormLevelNumber(String(full.level_number ?? 0));
      setFormTree(full.tree);
      setFormColors(full.targetColors);
      setEditorMode('add');
      setIsEditing(true);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load level' });
    } finally {
      setLoading(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (lvlId) => {
    if (!window.confirm(`Delete level "${lvlId}"? This cannot be undone.`)) return;
    try {
      setLoading(true);
      await deleteLevel(lvlId, adminKey);
      setStatusMsg({ type: 'success', text: `Level "${lvlId}" deleted.` });
      await loadLevels();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Deletion failed.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Editor: node click ────────────────────────────────────────────────────
  // Mirrors the LevelEditor logic from the reference implementation exactly.
  const handleEditorNodeClick = (id) => {
    if (editorMode === 'add') {
      // Add a new child node to the clicked node
      const newId = generateId();
      setFormTree(prev => ({
        ...prev,
        [id]:    { ...prev[id], children: [...(prev[id].children || []), newId] },
        [newId]: { id: newId, children: [], parentId: id },
      }));
      setFormColors(prev => ({ ...prev, [newId]: 'red' }));
    } else {
      // Toggle target color of the clicked node
      setFormColors(prev => ({
        ...prev,
        [id]: prev[id] === 'red' ? 'blue' : 'red',
      }));
    }
  };

  // ── Editor: reset ─────────────────────────────────────────────────────────
  const handleEditorReset = () => {
    setFormTree(INITIAL_TREE);
    setFormColors(INITIAL_COLORS);
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const levelNumber = Number(formLevelNumber);
    if (formLevelNumber.trim() === '' || !Number.isInteger(levelNumber) || levelNumber < 0) {
      setStatusMsg({ type: 'error', text: 'Level Number must be a non-negative whole number.' });
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: formName,
        level_number: levelNumber,
        tree: formTree,
        rootId: 'root',
        targetColors: formColors,
      };
      if (editingId) {
        await updateLevel(editingId, payload, adminKey);
        setStatusMsg({ type: 'success', text: `"${formName}" updated!` });
      } else {
        await createLevel(payload, adminKey);
        setStatusMsg({ type: 'success', text: `"${formName}" created!` });
      }
      setIsEditing(false);
      await loadLevels();
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Save failed — check Admin Key.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Login Screen ───────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto pt-12">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-center text-white mb-2">Admin Authentication</h2>
          <p className="text-xs text-slate-400 text-center mb-6">
            Enter the secret <code className="text-indigo-300">ADMIN_KEY</code> configured on the backend.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              placeholder="Enter your Admin Key"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-sm"
              required
            />
            <button type="submit" disabled={authenticating}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition flex items-center justify-center gap-2">
              <Unlock className="w-4 h-4" /> {authenticating ? 'Verifying…' : 'Authenticate'}
            </button>
            <button type="button" onClick={onExit}
              className="w-full py-2 text-slate-400 hover:text-white text-xs font-semibold">
              Back to Game
            </button>
          </form>
          {statusMsg?.type === 'error' && (
            <p className="mt-4 text-xs text-rose-300" role="alert">{statusMsg.text}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Level Management Portal</h2>
            <p className="text-xs text-slate-400">Authenticated via X-Admin-Key header</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={openCreate}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20">
            <Plus className="w-4 h-4" /> Create Level
          </button>
          <button onClick={loadLevels}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleLogout}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold transition">
            Lock
          </button>
          <button onClick={onExit}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition">
            Return
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
          statusMsg.type === 'error'
            ? 'bg-rose-950/40 border-rose-900/50 text-rose-200'
            : 'bg-emerald-950/40 border-emerald-900/50 text-emerald-200'
        }`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)}><X className="w-4 h-4 text-slate-400 hover:text-white" /></button>
        </div>
      )}

      {/* ── Level Editor Panel ─────────────────────────────────────────────── */}
      {isEditing && (
        <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl space-y-6">
          {/* Editor header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">
                {editingId ? `Editing: ${formName}` : 'Create New Level'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Use <strong>Add Nodes</strong> mode to build the tree, then <strong>Set Colors</strong> mode to paint target colors.
              </p>
            </div>
            <button onClick={() => setIsEditing(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Level name */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Level Title</label>
            <input
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium text-sm focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Level 5: The Grand Willow"
            />
          </div>

          <div>
            <label htmlFor="level-number" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Level Number
            </label>
            <input
              id="level-number"
              type="number"
              min="0"
              step="1"
              value={formLevelNumber}
              onChange={e => setFormLevelNumber(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium text-sm focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {/* Mode switch + Reset */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setEditorMode('add')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                editorMode === 'add' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              ➕ Add Nodes
            </button>
            <button
              onClick={() => setEditorMode('color')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                editorMode === 'color' ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              🎨 Set Colors
            </button>
            <button onClick={handleEditorReset}
              className="px-4 py-2 rounded-xl bg-rose-900/40 text-rose-300 hover:bg-rose-800/60 text-sm font-semibold transition">
              Reset Tree
            </button>

            <span className="ml-auto text-xs text-slate-400 italic">
              {editorMode === 'add'
                ? 'Click any node to append a child to it.'
                : 'Click any node to toggle its target color (Red ↔ Blue).'}
            </span>
          </div>

          {/* Interactive tree canvas */}
          <div className="max-w-lg mx-auto">
            <TreeView
              tree={formTree}
              rootId="root"
              nodeColors={formColors}
              onNodeClick={handleEditorNodeClick}
              title="Target Tree Preview"
              subtitle={editorMode === 'color' ? '🎨 Click nodes to paint target colors' : '➕ Click nodes to add child branches'}
              isInteractive={true}
            />
          </div>

          {/* Summary */}
          <div className="text-xs text-slate-500 font-mono bg-slate-950/50 rounded-xl p-3 border border-slate-800">
            Nodes: <span className="text-indigo-300">{Object.keys(formTree).length}</span>
            &nbsp;·&nbsp; Root: <span className="text-indigo-300">root</span>
            &nbsp;·&nbsp; Edges: <span className="text-indigo-300">
              {Object.values(formTree).reduce((s, n) => s + (n.children?.length || 0), 0)}
            </span>
          </div>

          {/* Save / Cancel */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition">
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/30 disabled:opacity-50">
              <Save className="w-4 h-4" /> {loading ? 'Saving…' : 'Save Level'}
            </button>
          </div>
        </div>
      )}

      {/* ── Level Table ──────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="px-6 py-4 border-b border-slate-800">
          <h3 className="font-bold text-white text-sm">Database Levels ({levels.length})</h3>
        </div>
        {levels.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No levels yet — click "Create Level" to publish the first one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">ID</th>
                  <th className="px-6 py-3.5">Level Number</th>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Nodes</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {levels.map(lvl => (
                  <tr key={lvl.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-mono text-slate-400">{lvl.id}</td>
                    <td className="px-6 py-4 font-mono text-indigo-400">{lvl.level_number}</td>
                    <td className="px-6 py-4 text-white font-semibold">{lvl.name}</td>
                    <td className="px-6 py-4 font-mono text-indigo-400">{lvl.node_count}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openEdit(lvl.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition inline-flex items-center gap-1">
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => handleDelete(lvl.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-rose-300 hover:text-white transition inline-flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
