/**
 * Fractal Planner - Головний JavaScript модуль
 * Реалізує фрактальне планування завдань згідно з ТЗ
 */

// Точні геометричні розрахунки згідно з ТЗ
class FractalGeometry {
    static polarToCartesian(cx, cy, r, angleRad) {
        return {
            x: cx + r * Math.cos(angleRad),
            y: cy + r * Math.sin(angleRad)
        };
    }

    static arcPath(cx, cy, rInner, rOuter, startAngle, endAngle) {
        const a1 = this.polarToCartesian(cx, cy, rOuter, endAngle);
        const a2 = this.polarToCartesian(cx, cy, rOuter, startAngle);
        const b1 = this.polarToCartesian(cx, cy, rInner, startAngle);
        const b2 = this.polarToCartesian(cx, cy, rInner, endAngle);
        const largeArcFlag = (endAngle - startAngle) % (2 * Math.PI) > Math.PI ? 1 : 0;
        
        const path = [
            `M ${a1.x} ${a1.y}`,
            `A ${rOuter} ${rOuter} 0 ${largeArcFlag} 0 ${a2.x} ${a2.y}`,
            `L ${b1.x} ${b1.y}`,
            `A ${rInner} ${rInner} 0 ${largeArcFlag} 1 ${b2.x} ${b2.y}`,
            'Z'
        ].join(' ');
        return path;
    }

    static hitTest(x, y, cx, cy, R) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);
        const angle = (Math.atan2(dy, dx) + 2 * Math.PI) % (2 * Math.PI);

        const R_core = 0.5 * R;
        const R_middle_inner = 0.5 * R;
        const R_middle_outer = 0.75 * R;
        const R_outer_inner = 0.75 * R;
        const R_outer = 1.0 * R;

        if (dist <= R_core) return { ring: 'core' };

        if (dist > R_middle_inner && dist <= R_middle_outer) {
            const numSmall = 16;
            const anglePer = 2 * Math.PI / numSmall;
            const index = Math.floor(angle / anglePer);
            const quarter = Math.floor(index / 4);
            return { ring: 'middle', index, quarter };
        }

        if (dist > R_outer_inner && dist <= R_outer) {
            const quarter = Math.floor(angle / (Math.PI / 2));
            return { ring: 'outer', quarter };
        }

        return null;
    }
}

// Головний клас фрактального кола
class FractalCircle {
    constructor(svgElement) {
        this.svg = svgElement;
        this.cx = 200;
        this.cy = 200;
        this.R = 160; // Базовий радіус
        this.selectedSector = null;
        this.onSectorClick = null;
        this.onSectorDrop = null;
        
        this.init();
    }

    init() {
        this.renderCircle();
        this.addEventListeners();
    }

    renderCircle() {
        this.svg.innerHTML = '';
        
        // Кольори згідно з ТЗ
        const outerColors = ['var(--outer-q1)', 'var(--outer-q2)', 'var(--outer-q3)', 'var(--outer-q4)'];
        const middleColors = ['var(--mid-q1)', 'var(--mid-q2)', 'var(--mid-q3)', 'var(--mid-q4)'];
        
        // Створюємо gradients для кращої візуалізації
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        this.svg.appendChild(defs);

        const angleOffset = -Math.PI / 2;
        // Рендеримо зовнішнє кільце (4 сектори)
        for (let q = 0; q < 4; q++) {
            const startAngle = q * Math.PI / 2 + angleOffset;
			const endAngle = (q + 1) * Math.PI / 2 + angleOffset;
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', FractalGeometry.arcPath(
                this.cx, this.cy, 
                0.75 * this.R, this.R, 
                startAngle, endAngle
            ));
            path.setAttribute('fill', outerColors[q]);
            path.classList.add('sector', 'outer-sector');
            path.dataset.ring = 'outer';
            path.dataset.quarter = q;
            
            this.svg.appendChild(path);
        }

        // Рендеримо середнє кільце (16 секторів)
        for (let i = 0; i < 16; i++) {
            const startAngle = i * Math.PI / 8 - Math.PI / 4; // Зміщуємо на -45°
            const endAngle = (i + 1) * Math.PI / 8 - Math.PI / 4;
            const quarter = Math.floor(i / 4);
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', FractalGeometry.arcPath(
                this.cx, this.cy, 
                0.5 * this.R, 0.75 * this.R, 
                startAngle, endAngle
            ));
            path.setAttribute('fill', middleColors[quarter]);
            path.classList.add('sector', 'middle-sector');
            path.dataset.ring = 'middle';
            path.dataset.index = i;
            path.dataset.quarter = quarter;
            
            this.svg.appendChild(path);
        }

        // Рендеримо ядро
        const core = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        core.setAttribute('cx', this.cx);
        core.setAttribute('cy', this.cy);
        core.setAttribute('r', 0.5 * this.R);
        core.setAttribute('fill', 'var(--core)');
        core.classList.add('sector', 'core-sector');
        core.dataset.ring = 'core';
        this.svg.appendChild(core);

        // Додаємо підписи
        this.addLabels();
    }

    addLabels() {
        // Підписи для зовнішнього кільця - часові інтервали
        const outerLabels = ['01:00-07:00', '07:00-13:00', '13:00-19:00', '19:00-01:00'];
        for (let q = 0; q < 4; q++) {
            const midAngle = (q + 0.5) * Math.PI / 2 - Math.PI / 4; // Зміщуємо на -45°
            const rText = (0.75 * this.R + this.R) / 2;
            const pos = FractalGeometry.polarToCartesian(this.cx, this.cy, rText, midAngle);
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', pos.x);
            text.setAttribute('y', pos.y);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', 'var(--text)');
            text.setAttribute('font-size', '10');
            text.setAttribute('font-weight', 'bold');
            text.textContent = outerLabels[q];
            text.style.pointerEvents = 'none';
            text.style.userSelect = 'none';
            
            this.svg.appendChild(text);
        }

        // Підписи для середнього кільця - підквартали по 90 хвилин
        const middleTimeLabels = this.generateMiddleTimeLabels();
        for (let i = 0; i < 16; i++) {
            const midAngle = (i + 0.5) * Math.PI / 8 - Math.PI / 4; // Зміщуємо на -45°
            const rText = (0.5 * this.R + 0.75 * this.R) / 2;
            const pos = FractalGeometry.polarToCartesian(this.cx, this.cy, rText, midAngle);
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', pos.x);
            text.setAttribute('y', pos.y);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', 'var(--text)');
            text.setAttribute('font-size', '8');
            text.textContent = middleTimeLabels[i];
            text.style.pointerEvents = 'none';
            text.style.userSelect = 'none';
            
            this.svg.appendChild(text);
        }

        // Підпис для ядра
        const coreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        coreText.setAttribute('x', this.cx);
        coreText.setAttribute('y', this.cy);
        coreText.setAttribute('text-anchor', 'middle');
        coreText.setAttribute('dominant-baseline', 'middle');
        coreText.setAttribute('fill', 'var(--text)');
        coreText.setAttribute('font-size', '16');
        coreText.setAttribute('font-weight', 'bold');
        coreText.textContent = 'NOW';
        coreText.style.pointerEvents = 'none';
        coreText.style.userSelect = 'none';
        
        this.svg.appendChild(coreText);
    }

    generateMiddleTimeLabels() {
        const labels = [];
        const quarterTimes = [
            ['01:00', '02:30', '04:00', '05:30'], // q1
            ['07:00', '08:30', '10:00', '11:30'], // q2
            ['13:00', '14:30', '16:00', '17:30'], // q3
            ['19:00', '20:30', '22:00', '23:30']  // q4
        ];

        for (let q = 0; q < 4; q++) {
            for (let sub = 0; sub < 4; sub++) {
                const startTime = quarterTimes[q][sub];
                const endTime = sub === 3 ? quarterTimes[(q + 1) % 4][0] : quarterTimes[q][sub + 1];
                labels.push(`${startTime}-${endTime}`);
            }
        }

        return labels;
    }

    addEventListeners() {
        this.svg.addEventListener('click', (e) => {
            if (e.target.classList.contains('sector')) {
                this.handleSectorClick(e.target);
            }
        });

        // Контекстне меню для видалення завдань
        this.svg.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (e.target.classList.contains('sector')) {
                this.handleSectorRightClick(e.target, e);
            }
        });

        // Drag & drop підтримка
        this.svg.addEventListener('dragover', (e) => {
            e.preventDefault();
            document.getElementById('dropTarget').classList.add('active');
        });

        this.svg.addEventListener('dragleave', (e) => {
            if (!this.svg.contains(e.relatedTarget)) {
                document.getElementById('dropTarget').classList.remove('active');
            }
        });

        this.svg.addEventListener('drop', (e) => {
            e.preventDefault();
            document.getElementById('dropTarget').classList.remove('active');
            this.handleDrop(e);
        });
    }

    handleSectorClick(sector) {
        // Очищаємо попередній вибір
        this.svg.querySelectorAll('.sector.selected').forEach(s => {
            s.classList.remove('selected');
        });
        
        // Позначаємо новий вибір
        sector.classList.add('selected');
        this.selectedSector = {
            ring: sector.dataset.ring,
            quarter: parseInt(sector.dataset.quarter) || 0,
            index: parseInt(sector.dataset.index) || 0
        };

        if (this.onSectorClick) {
            this.onSectorClick(this.selectedSector);
        }
    }

    handleSectorRightClick(sector, event) {
        const sectorInfo = {
            ring: sector.dataset.ring,
            quarter: parseInt(sector.dataset.quarter) || 0,
            index: parseInt(sector.dataset.index) || 0
        };

        this.showContextMenu(event.clientX, event.clientY, sectorInfo);
    }

    showContextMenu(x, y, sectorInfo) {
        // Видаляємо існуюче меню
        const existingMenu = document.getElementById('contextMenu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.id = 'contextMenu';
        menu.className = 'context-menu';
        menu.style.position = 'fixed';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.innerHTML = `
            <div class="context-menu-item" data-action="delete-tasks">
                Delete all tasks from this sector
            </div>
        `;

        menu.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'delete-tasks') {
                this.deleteSectorTasks(sectorInfo);
            }
            menu.remove();
        });

        // Видаляємо меню при кліку поза ним
        document.addEventListener('click', () => {
            menu.remove();
        }, { once: true });

        document.body.appendChild(menu);
    }

    async deleteSectorTasks(sectorInfo) {
        if (confirm('Are you sure you want to delete all tasks from this sector?')) {
            // Тут викликаємо функцію видалення через головний клас
            if (this.onSectorTasksDelete) {
                await this.onSectorTasksDelete(sectorInfo);
            }
        }
    }

    handleDrop(e) {
        const rect = this.svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Масштабуємо координати до SVG viewBox
        const scaleX = 400 / rect.width;
        const scaleY = 400 / rect.height;
        const svgX = x * scaleX;
        const svgY = y * scaleY;
        
        const hit = FractalGeometry.hitTest(svgX, svgY, this.cx, this.cy, this.R);
        
        if (hit && this.onSectorDrop) {
            this.onSectorDrop(hit, e.dataTransfer.getData('text/plain'));
        }
    }

    getSectorInfo(ring, quarter, index = 0) {
        return {
            ring,
            quarter,
            index,
            cycle: ring === 'outer' ? 'quarterly' : ring === 'middle' ? 'monthly' : 'daily'
        };
    }
}

// База даних (IndexedDB wrapper)
class TaskDB {
    constructor() {
        this.db = null;
        this.version = 1;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('fractal-planner-db', this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                
                if (!db.objectStoreNames.contains('tasks')) {
                    const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
                    tasksStore.createIndex('byStatus', 'status');
                    tasksStore.createIndex('byPriority', 'priority');
                    tasksStore.createIndex('bySector', ['cycle', 'sectorIndex']);
                }
                
                if (!db.objectStoreNames.contains('outbox')) {
                    db.createObjectStore('outbox', { autoIncrement: true });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    generateId() {
        return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async createTask(taskData) {
        const task = {
            id: this.generateId(),
            title: taskData.title || 'Untitled Task',
            description: taskData.description || '',
            start: taskData.start || new Date().toISOString(),
            end: taskData.end || new Date(Date.now() + 3600000).toISOString(),
            cycle: taskData.cycle || 'daily',
            level: taskData.level || 0,
            sectorIndex: taskData.sectorIndex || 0,
            status: taskData.status || 'not_started',
            priority: taskData.priority || 'medium',
            tags: taskData.tags || [],
            important: taskData.important || false,
            checklist: [],
            attachments: [],
            parentId: null,
            childrenIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            archived: false,
            synced: { gcalEventId: null, lastSyncedAt: null },
            lastModified: new Date().toISOString()
        };

        const tx = this.db.transaction(['tasks', 'outbox'], 'readwrite');
        await tx.objectStore('tasks').add(task);
        
        // Додаємо до outbox для синхронізації
        await tx.objectStore('outbox').add({
            opType: 'CREATE',
            taskId: task.id,
            payload: task,
            createdAt: new Date().toISOString(),
            tries: 0
        });
        
        return task;
    }

    async getTasks() {
        if (!this.db) await this.init();
        const tx = this.db.transaction('tasks', 'readonly');
        const store = tx.objectStore('tasks');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result.filter(task => !task.archived));
            request.onerror = () => reject(request.error);
        });
    }

    async getTasksBySector(cycle, sectorIndex) {
        if (!this.db) await this.init();
        const tx = this.db.transaction('tasks', 'readonly');
        const store = tx.objectStore('tasks');
        const index = store.index('bySector');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll([cycle, sectorIndex]);
            request.onsuccess = () => resolve(request.result.filter(task => !task.archived));
            request.onerror = () => reject(request.error);
        });
    }

    async updateTask(taskId, updates) {
        if (!this.db) await this.init();
        const tx = this.db.transaction(['tasks', 'outbox'], 'readwrite');
        const store = tx.objectStore('tasks');
        
        return new Promise(async (resolve, reject) => {
            const getRequest = store.get(taskId);
            getRequest.onsuccess = async () => {
                const task = getRequest.result;
                if (!task) {
                    reject(new Error('Task not found'));
                    return;
                }
                
                const updatedTask = {
                    ...task,
                    ...updates,
                    updatedAt: new Date().toISOString(),
                    lastModified: new Date().toISOString()
                };
                
                const putRequest = store.put(updatedTask);
                putRequest.onsuccess = async () => {
                    // Додаємо до outbox
                    await tx.objectStore('outbox').add({
                        opType: 'UPDATE',
                        taskId: taskId,
                        payload: updatedTask,
                        createdAt: new Date().toISOString(),
                        tries: 0
                    });
                    resolve(updatedTask);
                };
                putRequest.onerror = () => reject(putRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async deleteTask(taskId) {
        if (!this.db) await this.init();
        // Soft delete - архівуємо замість видалення
        return this.updateTask(taskId, { archived: true });
    }

    async deleteTasksBySector(cycle, sectorIndex) {
        const tasks = await this.getTasksBySector(cycle, sectorIndex);
        const deletePromises = tasks.map(task => this.deleteTask(task.id));
        return Promise.all(deletePromises);
    }
}

// Головний клас додатку
class FractalPlannerApp {
    constructor() {
        this.db = new TaskDB();
        this.fractalCircle = null;
        this.currentTasks = [];
        this.selectedSector = null;
        this.isDragging = false;
        
        this.init();
    }

    async init() {
        await this.db.init();
        
        // Ініціалізуємо фрактальне коло
        const svg = document.getElementById('fractalSvg');
        this.fractalCircle = new FractalCircle(svg);
        this.fractalCircle.onSectorClick = (sector) => this.handleSectorClick(sector);
        this.fractalCircle.onSectorDrop = (sector, data) => this.handleSectorDrop(sector, data);
        this.fractalCircle.onSectorTasksDelete = (sector) => this.handleSectorTasksDelete(sector);
        
        // Ініціалізуємо UI
        this.initUI();
        
        // Завантажуємо завдання
        await this.loadTasks();
        
        // Реєструємо Service Worker
        this.registerServiceWorker();
    }

    initUI() {
        const quickNote = document.getElementById('quickNote');
        const addBtn = document.getElementById('addBtn');
        const taskModal = document.getElementById('taskModal');
        const taskForm = document.getElementById('taskForm');
        const cancelBtn = document.getElementById('cancelBtn');

        // Quick Note drag & drop
        quickNote.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', quickNote.value);
            this.isDragging = true;
            quickNote.classList.add('dragging');
        });

        quickNote.addEventListener('dragend', () => {
            this.isDragging = false;
            quickNote.classList.remove('dragging');
        });

        // Add button
        addBtn.addEventListener('click', () => {
            this.openTaskModal();
        });

        // Modal events
        cancelBtn.addEventListener('click', () => {
            this.closeTaskModal();
        });

        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        // Клік поза модалом для закриття
        taskModal.addEventListener('click', (e) => {
            if (e.target === taskModal) {
                this.closeTaskModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTaskModal();
            }
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                // TODO: Implement undo
                console.log('Undo triggered');
            }
        });
    }

    async handleSectorClick(sector) {
        this.selectedSector = sector;
        await this.loadTasksForSector(sector);
        this.updatePanelTitle(sector);
    }

    async handleSectorDrop(sector, noteText) {
        if (!noteText.trim()) return;
        
        await this.createTaskForSector(sector, { title: noteText.trim() });
        
        // Очищаємо input
        document.getElementById('quickNote').value = '';
        
        // Оновлюємо список завдань якщо це поточний сектор
        if (this.selectedSector && 
            this.selectedSector.ring === sector.ring && 
            this.selectedSector.quarter === sector.quarter &&
            this.selectedSector.index === sector.index) {
            await this.loadTasksForSector(sector);
        }
    }

    async handleSectorTasksDelete(sector) {
        const sectorInfo = this.getSectorTimeInfo(sector);
        await this.db.deleteTasksBySector(sectorInfo.cycle, sectorInfo.sectorIndex);
        
        // Оновлюємо список якщо це поточний сектор
        if (this.selectedSector && 
            this.selectedSector.ring === sector.ring && 
            this.selectedSector.quarter === sector.quarter &&
            this.selectedSector.index === sector.index) {
            await this.loadTasksForSector(sector);
        }
        
        this.updateStatus('syncing');
    }

    async createTaskForSector(sector, taskData) {
        const sectorInfo = this.getSectorTimeInfo(sector);
        
        const task = await this.db.createTask({
            ...taskData,
            cycle: sectorInfo.cycle,
            sectorIndex: sectorInfo.sectorIndex,
            start: sectorInfo.start,
            end: sectorInfo.end
        });

        this.updateStatus('syncing');
        return task;
    }

    getSectorTimeInfo(sector) {
        const now = new Date();
        let start, end, cycle, sectorIndex;

        if (sector.ring === 'outer') {
            // Квартальні сектори
            cycle = 'quarterly';
            sectorIndex = sector.quarter;
            const quarter = Math.floor(now.getMonth() / 3);
            const yearStart = new Date(now.getFullYear(), quarter * 3, 1);
            start = yearStart.toISOString();
            end = new Date(now.getFullYear(), (quarter + 1) * 3, 0).toISOString();
        } else if (sector.ring === 'middle') {
            // Місячні підсектори
            cycle = 'monthly';
            sectorIndex = sector.index;
            const weekInMonth = Math.floor((now.getDate() - 1) / 7);
            const monthStart = new Date(now.getFullYear(), now.getMonth(), weekInMonth * 7 + 1);
            start = monthStart.toISOString();
            end = new Date(monthStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        } else {
            // Core - поточний день
            cycle = 'daily';
            sectorIndex = 0;
            const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            start = dayStart.toISOString();
            end = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000).toISOString();
        }

        return { cycle, sectorIndex, start, end };
    }

    async loadTasks() {
        this.currentTasks = await this.db.getTasks();
        this.renderTaskList(this.currentTasks);
    }

    async loadTasksForSector(sector) {
        const sectorInfo = this.getSectorTimeInfo(sector);
        const tasks = await this.db.getTasksBySector(sectorInfo.cycle, sectorInfo.sectorIndex);
        this.renderTaskList(tasks);
    }

    renderTaskList(tasks) {
        const taskList = document.getElementById('taskList');
        taskList.innerHTML = '';

        if (tasks.length === 0) {
            taskList.innerHTML = '<div style="text-align: center; opacity: 0.5; padding: 20px;">No tasks found</div>';
            return;
        }

        tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            taskList.appendChild(taskElement);
        });
    }

    createTaskElement(task) {
        const div = document.createElement('div');
        div.className = `task-item priority-${task.priority}`;
        div.dataset.taskId = task.id;
        
        const statusIcon = this.getStatusIcon(task.status);
        const priorityIcon = task.important ? '⬤' : '';
        
        div.innerHTML = `
            <div class="task-title">${statusIcon} ${task.title} ${priorityIcon}</div>
            <div class="task-time">${this.formatDateTime(task.start)} - ${this.formatDateTime(task.end)}</div>
            ${task.description ? `<div class="task-desc">${task.description}</div>` : ''}
            <div class="task-actions">
                <button class="task-delete-btn" onclick="event.stopPropagation(); app.deleteTask('${task.id}')">×</button>
            </div>
        `;
        
        div.addEventListener('click', () => {
            this.openTaskModal(task);
        });

        return div;
    }

    getStatusIcon(status) {
        const icons = {
            'not_started': '⭕',
            'in_progress': '🔄',
            'paused': '⏸️',
            'cancelled': '❌',
            'done': '✅'
        };
        return icons[status] || '⭕';
    }

    formatDateTime(isoString) {
        const date = new Date(isoString);
        return date.toLocaleString('uk-UA', { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    updatePanelTitle(sector) {
        const panelTitle = document.getElementById('panelTitle');
        let title = 'Tasks';
        
        if (sector.ring === 'outer') {
            const timeLabels = ['01:00-07:00', '07:00-13:00', '13:00-19:00', '19:00-01:00'];
            title = `Quarter ${sector.quarter + 1} (${timeLabels[sector.quarter]})`;
        } else if (sector.ring === 'middle') {
            const middleTimeLabels = this.fractalCircle.generateMiddleTimeLabels();
            title = `Subquarter ${sector.index + 1} (${middleTimeLabels[sector.index]})`;
        } else {
            title = 'Current Tasks (NOW)';
        }
        
        panelTitle.textContent = title;
    }

    openTaskModal(task = null) {
        const modal = document.getElementById('taskModal');
        const modalTitle = document.getElementById('modalTitle');
        const titleInput = document.getElementById('taskTitleInput');
        const descInput = document.getElementById('taskDescInput');
        const priorityInput = document.getElementById('taskPriorityInput');

        if (task) {
            modalTitle.textContent = 'Edit Task';
            titleInput.value = task.title;
            descInput.value = task.description;
            priorityInput.value = task.priority;
            modal.dataset.editingTaskId = task.id;
        } else {
            modalTitle.textContent = 'Create Task';
            titleInput.value = '';
            descInput.value = '';
            priorityInput.value = 'medium';
            delete modal.dataset.editingTaskId;
        }

        modal.classList.remove('hidden');
        titleInput.focus();
    }

    closeTaskModal() {
        const modal = document.getElementById('taskModal');
        modal.classList.add('hidden');
    }

    async saveTask() {
        const modal = document.getElementById('taskModal');
        const titleInput = document.getElementById('taskTitleInput');
        const descInput = document.getElementById('taskDescInput');
        const priorityInput = document.getElementById('taskPriorityInput');

        const taskData = {
            title: titleInput.value.trim(),
            description: descInput.value.trim(),
            priority: priorityInput.value
        };

        if (!taskData.title) {
            titleInput.focus();
            return;
        }

        try {
            if (modal.dataset.editingTaskId) {
                // Оновлення існуючого завдання
                await this.db.updateTask(modal.dataset.editingTaskId, taskData);
            } else {
                // Створення нового завдання
                if (this.selectedSector) {
                    await this.createTaskForSector(this.selectedSector, taskData);
                } else {
                    // Створення для поточного дня за замовчуванням
                    await this.createTaskForSector({ ring: 'core' }, taskData);
                }
            }

            this.closeTaskModal();
            
            // Оновлюємо список завдань
            if (this.selectedSector) {
                await this.loadTasksForSector(this.selectedSector);
            } else {
                await this.loadTasks();
            }
            
            this.updateStatus('syncing');
        } catch (error) {
            console.error('Error saving task:', error);
            alert('Error saving task. Please try again.');
        }
    }

    async deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            try {
                await this.db.deleteTask(taskId);
                
                // Оновлюємо список завдань
                if (this.selectedSector) {
                    await this.loadTasksForSector(this.selectedSector);
                } else {
                    await this.loadTasks();
                }
                
                this.updateStatus('syncing');
            } catch (error) {
                console.error('Error deleting task:', error);
                alert('Error deleting task. Please try again.');
            }
        }
    }

    updateStatus(status) {
        const indicator = document.getElementById('statusIndicator');
        indicator.className = `status-indicator status-${status}`;
        
        const statusText = {
            'offline': 'Offline',
            'syncing': 'Syncing...',
            'synced': 'Synced',
            'conflict': 'Conflict'
        };
        
        indicator.textContent = statusText[status] || status;
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('sw.js');
                console.log('Service Worker registered successfully');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }
}

// Ініціалізація додатку
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new FractalPlannerApp();
});

// PWA install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Можна показати кастомну кнопку встановлення
    console.log('PWA install prompt available');
});

// Обробка онлайн/офлайн статусу
window.addEventListener('online', () => {
    document.getElementById('statusIndicator').className = 'status-indicator status-syncing';
    document.getElementById('statusIndicator').textContent = 'Back Online';
});

window.addEventListener('offline', () => {
    document.getElementById('statusIndicator').className = 'status-indicator status-offline';
    document.getElementById('statusIndicator').textContent = 'Offline';
});