// Обробка модального вікна
const modal = document.getElementById('eventModal');
const closeModalBtn = document.querySelector('.close-modal');
const eventForm = document.getElementById('eventForm');
const addEventBtn = document.getElementById('addEventBtn');

function openModal() {
    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
}

addEventBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

eventForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // Тут буде логіка збереження події
    alert('Подія додана!');
    closeModal();
});

// Генерація календаря
function generateCalendar() {
    const calendarGrid = document.querySelector('.calendar-grid');
    calendarGrid.innerHTML = '';
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Перший день місяця
    const firstDay = new Date(currentYear, currentMonth, 1);
    // Останній день місяця
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // День тижня першого дня місяця (0 - неділя, 1 - понеділок, ...)
    let firstDayOfWeek = firstDay.getDay();
    // Корекція для понеділка як першого дня тижня
    if (firstDayOfWeek === 0) firstDayOfWeek = 7;
    
    // Дні попереднього місяця
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    
    // Заповнюємо календар
    for (let i = 1; i < firstDayOfWeek; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day', 'other-month');
        dayElement.innerHTML = `
            <div class="day-header">
                <span class="day-number">${prevMonthLastDay - firstDayOfWeek + i + 1}</span>
            </div>
        `;
        calendarGrid.appendChild(dayElement);
    }
    
    // Дні поточного місяця
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        
        // Перевіряємо, чи це сьогодні
        const isToday = i === today.getDate() && currentMonth === today.getMonth();
        
        dayElement.innerHTML = `
            <div class="day-header">
                <span class="day-number ${isToday ? 'today' : ''}">${i}</span>
            </div>
            <div class="day-events">
                ${generateDayEvents(i)}
            </div>
        `;
        
        calendarGrid.appendChild(dayElement);
    }
    
    // Дні наступного місяця
    const totalCells = 42; // 6 рядків по 7 днів
    const daysInCalendar = firstDayOfWeek - 1 + lastDay.getDate();
    const nextMonthDays = totalCells - daysInCalendar;
    
    for (let i = 1; i <= nextMonthDays; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day', 'other-month');
        dayElement.innerHTML = `
            <div class="day-header">
                <span class="day-number">${i}</span>
            </div>
        `;
        calendarGrid.appendChild(dayElement);
    }
}

// Генерація подій для дня (тимчасова функція)
function generateDayEvents(day) {
    // Тимчасові дані для демонстрації
    const events = [];
    
    if (day === 5) {
        events.push('<div class="day-event work">Планерка</div>');
        events.push('<div class="day-event study">Вивчення JavaScript</div>');
    }
    
    if (day === 12) {
        events.push('<div class="day-event sport">Пробіжка</div>');
    }
    
    if (day === 19) {
        events.push('<div class="day-event">Зустріч з клієнтом</div>');
    }
    
    if (day === 26) {
        events.push('<div class="day-event study">Читання книги</div>');
    }
    
    return events.join('');
}

// Збереження даних у локальне сховище
function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Завантаження даних з локального сховища
function loadFromLocalStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

// Ініціалізація додатка
document.addEventListener('DOMContentLoaded', () => {
    generateCalendar();
    
    // Завантаження даних з локального сховища
    const events = loadFromLocalStorage('qt_events') || [];
    const checklists = loadFromLocalStorage('qt_checklists') || [];
    
    console.log('Завантажені події:', events);
    console.log('Завантажені чек-листи:', checklists);
    
    // Реєстрація Service Worker для PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
        .then((registration) => {
            console.log('Service Worker зареєстрований: ', registration);
        })
        .catch((registrationError) => {
            console.log('Помилка реєстрації Service Worker: ', registrationError);
        });
    }
});