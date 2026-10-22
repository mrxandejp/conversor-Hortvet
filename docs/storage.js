export const DB_NAME = `hortvet-history:${new URL(".", import.meta.url).pathname}`;
export const STORE_NAME = "measurements";
let connection;

function database() {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE_NAME, {
        keyPath: "id",
      });
      store.createIndex("createdAt", "createdAt");
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("Feche outras abas do Hortvet e tente novamente."));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        connection = undefined;
      };
      db.onclose = () => {
        connection = undefined;
      };
      resolve(db);
    };
  }).catch((error) => {
    connection = undefined;
    throw error;
  });
  return connection;
}

async function transaction(mode, operation) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    let value;
    tx.oncomplete = () => resolve(value);
    tx.onabort = () =>
      reject(tx.error || new Error("A gravação foi cancelada."));
    tx.onerror = () => {}; // Abort is the final outcome, not an individual request event.
    try {
      operation(tx.objectStore(STORE_NAME), (result) => {
        value = result;
      });
    } catch (error) {
      tx.abort();
      reject(error);
    }
  });
}

export function listRecords() {
  return transaction("readonly", (store, done) => {
    store.getAll().onsuccess = (event) => done(event.target.result);
  });
}

export function saveRecord(record) {
  // The read and insert share one transaction: retries and concurrent tabs are idempotent.
  return transaction("readwrite", (store) => {
    store.get(record.id).onsuccess = (event) => {
      if (!event.target.result) store.add(record);
    };
  });
}

export function deleteRecord(id) {
  return transaction("readwrite", (store) => {
    store.delete(id);
  });
}

export function clearRecords() {
  return transaction("readwrite", (store) => {
    store.clear();
  });
}
