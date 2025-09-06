// RightPanel: TaskList, TaskCard
export function renderRightPanel(container) {
  container.innerHTML = '<div id="task-list"></div><div id="task-card" style="display:none;"></div>';
}

export function showTaskList(tasks, sectorIndex) {
  const list = document.getElementById('task-list');
  list.innerHTML = '';
  tasks.forEach(task => {
    const item = document.createElement('div');
    item.textContent = task.title;
    item.addEventListener('click', () => showTaskCard(task));
    list.appendChild(item);
  });
  list.style.display = 'block';
  document.getElementById('task-card').style.display = 'none';
}

export function showTaskCard(task) {
  const card = document.getElementById('task-card');
  card.innerHTML = `
    <h3>${task.title}</h3>
    <p>${task.description}</p>
    // ... інші поля, edit form, batch if multiselect
  `;
  card.style.display = 'block';
  document.getElementById('task-list').style.display = 'none';
}

// ... Multiselect, batch edit