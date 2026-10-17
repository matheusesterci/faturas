// Safe storage utility that protects against localStorage QuotaExceededError
// and uses IndexedDB to store heavy binary assets like attached boletos.

const DB_NAME = 'betravel_storage_db';
const DB_VERSION = 1;
const STORE_BOLETOS = 'boletos';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_BOLETOS)) {
        db.createObjectStore(STORE_BOLETOS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBoletoToIDB(id: string, dataUrl: string): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_BOLETOS, 'readwrite');
      const store = tx.objectStore(STORE_BOLETOS);
      store.put({ id, dataUrl, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IDB boleto save skipped:', err);
  }
}

export async function getBoletoFromIDB(id: string): Promise<string | null> {
  try {
    const db = await getDB();
    return await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE_BOLETOS, 'readonly');
      const store = tx.objectStore(STORE_BOLETOS);
      const req = store.get(id);
      req.onsuccess = () => {
        resolve(req.result ? req.result.dataUrl : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IDB boleto read error:', err);
    return null;
  }
}

export async function deleteBoletoFromIDB(id: string): Promise<void> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_BOLETOS, 'readwrite');
      const store = tx.objectStore(STORE_BOLETOS);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IDB boleto delete error:', err);
  }
}

/**
 * Safely set a key-value in localStorage without throwing QuotaExceededError
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`localStorage.setItem failed for key "${key}" (likely quota exceeded):`, e);
    return false;
  }
}

/**
 * Sanitize an invoice or invoice array before saving to localStorage to prevent quota exhaustion
 */
export function sanitizeInvoiceForStorage(invoice: any): any {
  if (!invoice) return invoice;
  if (!invoice.attachedBoleto) return invoice;

  // Clone shallowly
  const sanitized = { ...invoice };
  if (sanitized.attachedBoleto && sanitized.attachedBoleto.dataUrl) {
    // If dataUrl is larger than 20KB, omit from localStorage payload
    // The full dataUrl is safely in IndexedDB and in React state!
    if (sanitized.attachedBoleto.dataUrl.length > 20000) {
      sanitized.attachedBoleto = {
        ...sanitized.attachedBoleto,
        dataUrl: '', // empty in localStorage to preserve quota
        inIndexedDB: true,
      };
    }
  }
  return sanitized;
}
