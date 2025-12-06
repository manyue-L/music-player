// IndexedDB utility for persistent music storage
const DB_NAME = 'DavidMusicVisualizerDB';
const STORE_NAME = 'songs';
const DB_VERSION = 1;

export interface StoredSong {
  id: string;
  name: string;
  blob: Blob;
  createdAt: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject('Database error: ' + (event.target as any).error);

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveSongToDB = async (file: File): Promise<StoredSong> => {
  const db = await openDB();
  const id = crypto.randomUUID();
  const song: StoredSong = {
    id,
    name: file.name.replace(/\.[^/.]+$/, ""),
    blob: file,
    createdAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(song);

    request.onsuccess = () => resolve(song);
    request.onerror = () => reject('Error saving song');
  });
};

export const getAllSongsFromDB = async (): Promise<StoredSong[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject('Error fetching songs');
  });
};

export const deleteSongFromDB = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error deleting song');
  });
};
