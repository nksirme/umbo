import { kinds } from './data.js';

const DB_NAME = 'umbo.prototype.assets.v1';
const STORE_NAME = 'assets';
const DB_VERSION = 1;
const imageFields = ['avatar', 'cover'];

export const isDataUrl = (value) => typeof value === 'string' && value.startsWith('data:');
export const assetKey = (kind, scope, field, id = '') => `profile:${kind}:${scope}:${field}:${id}`;

function browserIndexedDB() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined' ? window.indexedDB : null;
}

function openAssetsDb() {
  const indexedDB = browserIndexedDB();
  if (!indexedDB) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB could not be opened.'));
  });
}

function eachProfileAsset(state, callback) {
  for (const kind of kinds) {
    const record = state.profiles?.[kind];
    if (!record) continue;
    for (const scope of ['draft', 'published']) {
      const profile = record[scope];
      if (!profile) continue;
      for (const field of imageFields) {
        if (isDataUrl(profile[field])) callback({ key: assetKey(kind, scope, field), kind, scope, field, dataUrl: profile[field] });
      }
      for (const file of profile.files || []) {
        if (isDataUrl(file.dataUrl)) callback({ key: assetKey(kind, scope, 'file', file.id), kind, scope, field: 'file', id: file.id, dataUrl: file.dataUrl });
      }
    }
  }
}

export function serializeStateForStorage(state) {
  const serialized = structuredClone(state);
  for (const kind of kinds) {
    const record = serialized.profiles?.[kind];
    if (!record) continue;
    for (const scope of ['draft', 'published']) {
      const profile = record[scope];
      if (!profile) continue;
      for (const field of imageFields) {
        if (isDataUrl(profile[field])) {
          profile[`${field}Ref`] = assetKey(kind, scope, field);
          profile[field] = '';
        }
      }
      profile.files = (profile.files || []).map((file) => {
        if (!isDataUrl(file.dataUrl)) return file;
        return { ...file, dataUrl: '', storageKey: assetKey(kind, scope, 'file', file.id) };
      });
    }
  }
  return serialized;
}

export async function persistStateAssets(state) {
  const records = [];
  eachProfileAsset(state, (record) => records.push(record));
  if (!records.length) return;
  const db = await openAssetsDb();
  if (!db) throw new Error('Browser asset storage is unavailable.');
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    records.forEach((record) => store.put(record));
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('Profile assets could not be saved.'));
    transaction.onabort = () => reject(transaction.error || new Error('Profile asset save was aborted.'));
  });
  db.close();
}

function readAsset(store, key) {
  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.dataUrl || '');
    request.onerror = () => reject(request.error || new Error('Profile asset could not be read.'));
  });
}

export async function hydrateStateAssets(state) {
  const db = await openAssetsDb();
  if (!db) return [];
  const references = [];
  for (const kind of kinds) {
    const record = state.profiles?.[kind];
    if (!record) continue;
    for (const scope of ['draft', 'published']) {
      const profile = record[scope];
      if (!profile) continue;
      for (const field of imageFields) {
        if (profile[`${field}Ref`]) references.push({ key: profile[`${field}Ref`], kind, scope, field });
      }
      for (const file of profile.files || []) {
        if (file.storageKey) references.push({ key: file.storageKey, kind, scope, field: 'file', id: file.id });
      }
    }
  }
  if (!references.length) { db.close(); return []; }
  const assets = await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    Promise.all(references.map(async (reference) => ({ ...reference, dataUrl: await readAsset(store, reference.key) }))).then(resolve).catch(reject);
  });
  db.close();
  return assets.filter((asset) => asset.dataUrl);
}
