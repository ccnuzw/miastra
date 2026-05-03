const databaseName = 'new-pic-studio'
const databaseVersion = 1
const storeName = 'key-value'

function hasIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB != null
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('IndexedDB is not available'))
      return
    }

    const request = window.indexedDB.open(databaseName, databaseVersion)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
  })
}

async function withStore<T>(mode: IDBTransactionMode, callback: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const request = callback(store)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    }
  })
}

export async function readBrowserValue<T>(key: string, fallback: T): Promise<T> {
  if (!hasIndexedDb()) {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? JSON.parse(raw) as T : fallback
    } catch {
      return fallback
    }
  }

  try {
    const value = await withStore<T | undefined>('readonly', (store) => store.get(key))
    return value ?? fallback
  } catch {
    return fallback
  }
}

export async function writeBrowserValue<T>(key: string, value: T) {
  if (!hasIndexedDb()) {
    window.localStorage.setItem(key, JSON.stringify(value))
    return
  }

  await withStore<IDBValidKey>('readwrite', (store) => store.put(value, key))
}

export async function deleteBrowserValue(key: string) {
  if (!hasIndexedDb()) {
    window.localStorage.removeItem(key)
    return
  }

  await withStore<undefined>('readwrite', (store) => store.delete(key))
}
