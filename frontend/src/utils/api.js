function getApiBase(url) {
  const configuredUrl = url?.trim().replace(/\/+$/, '');
  if (!configuredUrl) return '/api';

  if (configuredUrl.startsWith('/')) {
    return configuredUrl.endsWith('/api') ? configuredUrl : `${configuredUrl}/api`;
  }

  const absoluteUrl = /^https?:\/\//i.test(configuredUrl)
    ? configuredUrl
    : `https://${configuredUrl}`;
  return absoluteUrl.endsWith('/api') ? absoluteUrl : `${absoluteUrl}/api`;
}

const API_BASE = getApiBase(import.meta.env.VITE_API_URL);
const LEVELS_CACHE_KEY = 'tree_flipper_level_summaries';
let cachedLevels;

export function getCachedLevels() {
  if (cachedLevels !== undefined) return cachedLevels;

  try {
    const savedLevels = localStorage.getItem(LEVELS_CACHE_KEY);
    cachedLevels = savedLevels ? JSON.parse(savedLevels) : null;
    if (!Array.isArray(cachedLevels)) {
      cachedLevels = null;
      localStorage.removeItem(LEVELS_CACHE_KEY);
    }
  } catch (error) {
    cachedLevels = null;
    console.warn('Unable to read cached level summaries:', error);
  }
  return cachedLevels;
}

function cacheLevels(levels) {
  cachedLevels = levels;
  try {
    localStorage.setItem(LEVELS_CACHE_KEY, JSON.stringify(levels));
  } catch (error) {
    console.warn('Unable to cache level summaries:', error);
  }
}

export function invalidateLevelListCache() {
  cachedLevels = undefined;
  try {
    localStorage.removeItem(LEVELS_CACHE_KEY);
  } catch (error) {
    console.warn('Unable to clear cached level summaries:', error);
  }
}

export async function fetchLevels() {
  const startedAt = performance.now();
  const res = await fetch(`${API_BASE}/levels`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to load levels: ${res.statusText}`);
  }
  const levels = await res.json();
  cacheLevels(levels);
  console.info(`GET /api/levels completed in ${(performance.now() - startedAt).toFixed(1)}ms`);
  return levels;
}

export async function fetchLevelById(id) {
  const res = await fetch(`${API_BASE}/levels/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to load level ${id}: ${res.statusText}`);
  }
  return res.json();
}

export async function createLevel(levelData, adminKey) {
  const res = await fetch(`${API_BASE}/levels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey,
    },
    body: JSON.stringify(levelData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to create level: ${res.statusText}`);
  }
  invalidateLevelListCache();
  return res.json();
}

export async function updateLevel(id, levelData, adminKey) {
  const res = await fetch(`${API_BASE}/levels/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey,
    },
    body: JSON.stringify(levelData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to update level: ${res.statusText}`);
  }
  invalidateLevelListCache();
  return res.json();
}

export async function deleteLevel(id, adminKey) {
  const res = await fetch(`${API_BASE}/levels/${id}`, {
    method: 'DELETE',
    headers: {
      'X-Admin-Key': adminKey,
    },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to delete level: ${res.statusText}`);
  }
  invalidateLevelListCache();
  return res.json();
}
