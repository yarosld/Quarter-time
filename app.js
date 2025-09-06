// Головний скрипт: ініціалізація, event listeners, інтеграція компонентів
import { createFractalCircle, hitTest } from './fractal-circle.js';
import { openDB, getTasksBySector, createTask, updateTask, deleteTask, enqueueOutbox, processOutbox, exportJSON } from './db.js';
import { loginWithGoogle, syncTaskToGCal } from './sync.js';
import { renderRightPanel, showTaskList, showTaskCard } from './right-panel.js';
import { initQuickNote } from './quick-note.js';

async function initApp() {
  await openDB(); // Ініціалізувати DB

  // FractalCircle
  const container = document.getElementById('fractal-container');
  const svg = createFractalCircle(container);
  container.appendChild(svg);

  // RightPanel
  const rightPanel = document.getElementById('right-panel');
  renderRightPanel(rightPanel);

  // QuickNote drag&drop
  initQuickNote();

  // Event listeners
  svg.addEventListener('click', async (e) => {
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = svg.viewBox.baseVal.width / 2;
    const cy = svg.viewBox.baseVal.height / 2;
    const R = Math.min(cx, cy) * 0.5; // Адаптовано під контейнер
    const hit = hitTest(x, y, cx, cy, R);

    if (hit) {
      if (hit.ring === 'middle') {
        const tasks = await getTasksBySector('yearly', 1, hit.index);
        showTaskList(tasks, hit.index);
      } // Додати zoom logic для outer/core
    }
  });

  // Login button (додайте UI для меню)
  document.addEventListener('online', processOutbox);
  // ... інші listeners: undo/redo, multiselect, etc.
}

initApp();

// Export example
document.getElementById('export-btn').addEventListener('click', exportJSON); // Додайте button в UI