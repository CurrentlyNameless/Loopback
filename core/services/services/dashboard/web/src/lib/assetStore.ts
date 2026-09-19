// ─── IndexedDB & Server Asset Engine for Backgrounds, GIFs, and Audio FX ───────
const DB_NAME = 'floofcore-dashboard-assets';
const DB_VERSION = 1;
const STORE_NAME = 'media';

export interface DashboardAsset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  size: number;
  mimeType: string;
  url?: string;
  createdAt: number;
}

const urlCache = new Map<string, string>();

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

export async function saveAssetBlob(id: string, blob: Blob, meta: Omit<DashboardAsset, 'id'>): Promise<DashboardAsset> {
  const db = await openDB();
  const asset: DashboardAsset = { id, ...meta };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id, blob, meta: asset });
    tx.oncomplete = () => {
      if (meta.url) {
        urlCache.set(id, meta.url);
      }
      resolve(asset);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAssetBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result?.blob || null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAssetUrl(id: string): Promise<string | null> {
  if (urlCache.has(id)) return urlCache.get(id)!;
  try {
    const db = await openDB();
    const meta: DashboardAsset | null = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result?.meta || null);
      req.onerror = () => resolve(null);
    });

    if (meta?.url) {
      urlCache.set(id, meta.url);
      return meta.url;
    }
  } catch {}

  const blob = await getAssetBlob(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export async function deleteAsset(id: string): Promise<void> {
  const db = await openDB();
  if (urlCache.has(id)) {
    const cached = urlCache.get(id)!;
    if (cached.startsWith('blob:')) URL.revokeObjectURL(cached);
    urlCache.delete(id);
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllAssets(): Promise<DashboardAsset[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        resolve(items.map((i: any) => i.meta as DashboardAsset));
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export const getStoredAssets = getAllAssets;

export async function uploadDashboardAsset(file: File): Promise<DashboardAsset> {
  let fileType: 'image' | 'video' | 'audio' = 'image';
  if (file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.ogg')) {
    fileType = 'audio';
  } else if (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.webm')) {
    fileType = 'video';
  }

  let serverUrl = '';
  try {
    // 1. Try direct raw streaming (highest reliability, no boundary issues)
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-File-Name': encodeURIComponent(file.name),
      },
      body: file,
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) serverUrl = data.url;
    }
  } catch (err) {
    console.warn('Direct stream upload fallback, trying FormData:', err);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) serverUrl = data.url;
      }
    } catch (formErr) {
      console.warn('Server upload fallback to IndexedDB:', formErr);
    }
  }

  const id = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const asset = await saveAssetBlob(id, file, {
    name: file.name,
    type: fileType,
    size: file.size,
    mimeType: file.type || 'audio/mpeg',
    url: serverUrl || undefined,
    createdAt: Date.now(),
  });

  return asset;
}
