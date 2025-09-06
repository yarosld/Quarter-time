// QuickNote: draggable input, drop to sector
export function initQuickNote() {
  const quickNote = document.getElementById('quick-note');
  quickNote.draggable = true;
  quickNote.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', quickNote.value);
  });

  const svg = document.querySelector('svg');
  svg.addEventListener('dragover', (e) => e.preventDefault());
  svg.addEventListener('drop', async (e) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text/plain');
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = svg.viewBox.baseVal.width / 2;
    const cy = svg.viewBox.baseVal.height / 2;
    const R = Math.min(cx, cy) * 0.5;
    const hit = hitTest(x, y, cx, cy, R);
    if (hit && hit.ring === 'middle') {
      // Open modal prefilled
      const task = { title: text, cycle: 'yearly', level: 1, sectorIndex: hit.index /* calculate start/end from sector */ };
      createTask(task);
    }
    quickNote.value = '';
  });
}