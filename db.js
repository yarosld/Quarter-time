// IndexedDB wrapper: schema, CRUD, outbox, undo/redo
let db;

export async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fractal-planner-db', 1);
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      db.createObjectStore('tasks', { keyPath: 'id' }).createIndex('bySector', ['cycle', 'level', 'sectorIndex']);
      // Додати інші indexes: byStart, byStatus etc. як в ТЗ
      db.createObjectStore('outbox', { autoIncrement: true });
      db.createObjectStore('settings', { keyPath: 'key' });
      db.createObjectStore('attachments', { keyPath: 'id' });
      db.createObjectStore('undoRedo', { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };
    request.onerror = reject;
  });
}

export async function getTask(id) {
  const tx = db.transaction('tasks', 'readonly');
  const store = tx.objectStore('tasks');
  return store.get(id);
}

export async function getTasksBySector(cycle, level, sectorIndex) {
  const tx = db.transaction('tasks', 'readonly');
  const index = tx.objectStore('tasks').index('bySector');
  const key = IDBKeyRange.only([cycle, level, sectorIndex]);
  return index.getAll(key);
}

export async function createTask(task) {
  task.createdAt = new Date().toISOString();
  task.updatedAt = task.createdAt;
  task.lastModified = task.updatedAt;
  task.id = crypto.randomUUID(); // uuid-v4
  task.synced = { gcalEventId: null, lastSyncedAt: null };
  const tx = db.transaction('tasks', 'readwrite');
  await tx.objectStore('tasks').add(task);
  enqueueOutbox('CREATE', task.id, task);
  // Add to undo stack
  await tx.done;
}

export async function updateTask(task) {
  task.updatedAt = new Date().toISOString();
  task.lastModified = task.updatedAt;
  const tx = db.transaction('tasks', 'readwrite');
  await tx.objectStore('tasks').put(task);
  enqueueOutbox('UPDATE', task.id, task);
  await tx.done;
}

export async function deleteTask(id) {
  const tx = db.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');
  const task = await store.get(id);
  task.archived = true;
  await store.put(task);
  enqueueOutbox('DELETE', id, task);
  await tx.done;
}

export async function enqueueOutbox(opType, taskId, payload) {
  const tx = db.transaction('outbox', 'readwrite');
  await tx.objectStore('outbox').add({ opType, taskId, payload, createdAt: new Date().toISOString(), tries: 0 });
  await tx.done;
}

export async function processOutbox() {
  const tx = db.transaction('outbox', 'readwrite');
  const store = tx.objectStore('outbox');
  let cursor = await store.openCursor();
  while (cursor) {
    const op = cursor.value;
    try {
      // Виклик syncTaskToGCal з sync.js
      await syncTaskToGCal(op);
      await cursor.delete();
    } catch (err) {
      op.tries++;
      await cursor.update(op);
      if (op.tries > 5) await cursor.delete(); // Max tries
      break;
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function exportJSON() {
  const tx = db.transaction(['tasks', 'attachments'], 'readonly');
  const tasks = await tx.objectStore('tasks').getAll();
  const attachments = await tx.objectStore('attachments').getAll();
  const json = JSON.stringify({ tasks, attachments });
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fractal-planner-backup.json';
  a.click();
}

// ... Додати importJSON, undo/redo logic (stack capped 50)