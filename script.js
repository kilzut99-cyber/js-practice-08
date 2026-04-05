"use strict"; // Включаем строгий режим для повышения безопасности и отлова ошибок

/**
 * 4. МАСШТАБИРУЕМОСТЬ API: Базовый URL вынесен в константу.
 * Это позволяет централизованно менять адрес API во всем проекте.
 */
const GITHUB_API_URL = 'https://api.github.com';

/**
 * 2. ЛИМИТ ИСТОРИИ: Увеличен до 5 записей.
 * Делает раздел истории более полезным для пользователя.
 */
const HISTORY_LIMIT = 5;

/* --- Инициализация ссылок на DOM-элементы --- */
const searchBtn = document.getElementById('searchBtn'); // Кнопка запуска поиска
const usernameInput = document.getElementById('username'); // Поле ввода имени
const loader = document.getElementById('loader'); // Индикатор загрузки
const errorDiv = document.getElementById('error'); // Блок для вывода ошибок
const profileDiv = document.getElementById('profile'); // Контейнер для карточки профиля
const reposList = document.getElementById('repos'); // Список репозиториев (ul)
const paginationDiv = document.getElementById('pagination'); // Блок кнопок страниц
const autocompleteList = document.getElementById('autocomplete-list'); // Список подсказок

let currentPage = 1; // Глобальная переменная для хранения текущей страницы
const reposPerPage = 5; // Количество репозиториев, запрашиваемых за один раз

/**
 * АВТОКОМПЛИТ: Динамическая фильтрация истории поиска при вводе
 */
usernameInput.addEventListener('input', function() {
    const val = this.value.trim(); // Получаем очищенное от пробелов значение
    autocompleteList.innerHTML = ""; // Очищаем старые подсказки
    if (!val) return; // Если поле пустое, ничего не делаем

    const history = JSON.parse(localStorage.getItem('gh_spy_history') || "[]"); // Загружаем историю
    // Фильтруем историю: ищем имена, начинающиеся с введенных символов
    const matches = history.filter(name => name.toLowerCase().startsWith(val.toLowerCase()));
    
    matches.forEach(name => {
        const div = document.createElement('div'); // Создаем элемент подсказки
        div.textContent = name; // Безопасно записываем текст
        div.onclick = () => {
            usernameInput.value = name; // Подставляем значение при клике
            autocompleteList.innerHTML = ""; // Скрываем список
            handleSearch(); // Запускаем поиск автоматически
        };
        autocompleteList.appendChild(div); // Добавляем подсказку в список
    });
});

/**
 * ГЛАВНАЯ ФУНКЦИЯ ЗАПРОСА ДАННЫХ
 * Использует Promise.all для параллельного выполнения запросов (профиль + репозитории)
 */
async function fetchData(username, page = 1) {
    toggleUI(true); // Блокируем интерфейс и включаем лоадер
    clearScreen(); // Очищаем старые данные с экрана
    try {
        // Выполняем запросы к GitHub API используя константу базового URL
        const [resUser, resRepos] = await Promise.all([
            fetch(`${GITHUB_API_URL}/users/${username}`),
            fetch(`${GITHUB_API_URL}/users/${username}/repos?sort=updated&per_page=${reposPerPage}&page=${page}`)
        ]);

        // Проверка статуса ответа: fetch не считает 404 ошибкой сам по себе
        if (!resUser.ok) {
            if (resUser.status === 404) throw new Error("Пользователь не найден");
            throw new Error(`Ошибка GitHub: ${resUser.status}`);
        }

        const userData = await resUser.json(); // Десериализация данных профиля
        const reposData = await resRepos.json(); // Десериализация списка репозиториев

        renderProfile(userData); // Отрисовываем карточку пользователя
        renderRepos(reposData, userData.public_repos, username); // Отрисовываем репозитории
        saveHistory(username); // Сохраняем успешный поиск в историю
    } catch (err) {
        showError(err.message); // Выводим текст ошибки пользователю
    } finally {
        toggleUI(false); // В любом случае выключаем лоадер
    }
}

/**
 * ОТРИСОВКА ПРОФИЛЯ
 * Использует createElement для исключения XSS уязвимостей
 */
function renderProfile(user) {
    profileDiv.innerHTML = ""; // Очищаем контейнер
    const avatar = document.createElement('img'); // Создаем изображение
    avatar.src = user.avatar_url; // Указываем ссылку на аватар
    // 3. ДОСТУПНОСТЬ: Указываем альтернативный текст для скринридеров
    avatar.alt = `Аватар пользователя ${user.name || user.login}`;
    avatar.style.width = "80px"; 
    avatar.style.borderRadius = "50%";

    const name = document.createElement('h2'); // Создаем заголовок имени
    name.textContent = user.name || user.login; // Безопасно выводим имя

    const bio = document.createElement('p'); // Создаем элемент биографии
    bio.textContent = user.bio || "Описание отсутствует";

    profileDiv.append(avatar, name, bio); // Добавляем все элементы в DOM
    document.getElementById('profile-section').classList.remove('hidden'); // Показываем секцию
}

/**
 * 1. БЕЗОПАСНЫЙ РЕНДЕРИНГ РЕПОЗИТОРИЕВ (Защита от XSS)
 * Полный отказ от innerHTML в пользу createElement и textContent.
 */
function renderRepos(repos, total, user) {
    reposList.innerHTML = ""; // Очищаем список перед отрисовкой
    
    repos.forEach(repo => {
        const li = document.createElement('li'); // Создаем элемент списка
        li.className = "repo-item";

        const a = document.createElement('a'); // Создаем ссылку на репозиторий
        a.href = repo.html_url;
        a.target = "_blank"; // Открываем в новой вкладке
        a.textContent = repo.name; // Защита: имя репозитория выводится как чистый текст
        // 3. ДОСТУПНОСТЬ: Добавляем пояснение для программ экранного доступа
        a.setAttribute('aria-label', `Открыть репозиторий ${repo.name} на GitHub`);

        const p = document.createElement('p'); // Создаем описание
        p.style.fontSize = "14px";
        p.style.color = "#57606a";
        p.textContent = repo.description || ""; // Безопасный вывод описания

        const starDiv = document.createElement('div'); // Блок со звездами
        const starSpan = document.createElement('span');
        starSpan.className = "star-icon";
        starSpan.textContent = "★"; // Символ звезды
        starDiv.append(starSpan, ` ${repo.stargazers_count}`); // Добавляем количество звезд

        li.append(a, p, starDiv); // Собираем элемент списка
        reposList.append(li); // Добавляем в общий список
    });

    renderPagination(total, user); // Инициализируем пагинацию
    document.getElementById('repos-section').classList.remove('hidden'); // Показываем секцию
}

/**
 * 3. ДОСТУПНОСТЬ: Пагинация с aria-label
 */
function renderPagination(total, user) {
    paginationDiv.innerHTML = ""; // Очистка кнопок
    const pages = Math.ceil(total / reposPerPage); // Считаем общее кол-во страниц
    if (pages <= 1) return; // Если страница одна, пагинация не нужна

    for (let i = 1; i <= Math.min(pages, 10); i++) { // Ограничиваем вывод 10 страницами
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        // Добавляем атрибут доступности для каждой кнопки страницы
        btn.setAttribute('aria-label', `Перейти на страницу репозиториев ${i}`);
        
        btn.onclick = () => {
            currentPage = i; // Обновляем состояние текущей страницы
            fetchData(user, i); // Запрашиваем данные для выбранной страницы
        };
        paginationDiv.append(btn); // Добавляем кнопку в контейнер
    }
}

/**
 * 2. РАБОТА С ИСТОРИЕЙ (localStorage)
 * Реализовано ограничение лимита согласно HISTORY_LIMIT.
 */
function saveHistory(u) {
    let h = JSON.parse(localStorage.getItem('gh_spy_history') || "[]");
    if (!h.includes(u)) {
        h.unshift(u); // Добавляем новый запрос в начало массива
        if (h.length > HISTORY_LIMIT) h.pop(); // Удаляем самый старый запрос при превышении лимита
        localStorage.setItem('gh_spy_history', JSON.stringify(h)); // Сохраняем обновленный массив
        renderHistory(); // Перерисовываем блок истории
    }
}

/**
 * ОТРИСОВКА ИСТОРИИ (Теги поиска)
 */
function renderHistory() {
    const h = JSON.parse(localStorage.getItem('gh_spy_history') || "[]");
    const container = document.getElementById('history');
    container.innerHTML = ""; // Очищаем теги
    
    h.forEach(name => {
        const btn = document.createElement('button'); // Создаем овальный тег-кнопку
        btn.className = "history-tag-btn";
        btn.textContent = name;
        // 3. ДОСТУПНОСТЬ: Добавляем описание действия кнопки
        btn.setAttribute('aria-label', `Повторить поиск для пользователя ${name}`);
        
        btn.onclick = () => {
            usernameInput.value = name; // Подставляем имя в поле ввода
            handleSearch(); // Запускаем поиск
        };
        container.append(btn); // Добавляем тег на экран
    });

    // Показываем или скрываем секцию истории в зависимости от наличия данных
    document.getElementById('history-section').classList.toggle('hidden', !h.length);
}

/**
 * ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
 */
function toggleUI(isLoading) {
    searchBtn.disabled = isLoading; // Блокируем кнопку поиска во время запроса
    loader.classList.toggle('hidden', !isLoading); // Показываем/скрываем лоадер
}

function clearScreen() {
    errorDiv.classList.add('hidden'); // Скрываем блок ошибок
    document.getElementById('profile-section').classList.add('hidden'); // Скрываем профиль
    document.getElementById('repos-section').classList.add('hidden'); // Скрываем репозитории
    autocompleteList.innerHTML = ""; // Очищаем автокомплит
}

function showError(msg) {
    errorDiv.textContent = msg; // Безопасно выводим текст ошибки
    errorDiv.classList.remove('hidden'); // Показываем блок
}

function handleSearch() {
    const user = usernameInput.value.trim(); // Получаем значение ввода
    if (user) {
        currentPage = 1; // Сбрасываем пагинацию на первую страницу
        fetchData(user); // Запускаем основной процесс получения данных
    }
}

/* --- Слушатели событий (Event Listeners) --- */

// Обработка отправки формы (клик на "Найти" или клавиша Enter)
document.getElementById('search-form').onsubmit = (e) => {
    e.preventDefault(); // Предотвращаем перезагрузку страницы
    handleSearch();
};

// Логика кнопки "Очистить историю"
document.getElementById('clearHistory').onclick = () => {
    localStorage.removeItem('gh_spy_history'); // Полностью очищаем хранилище браузера
    renderHistory(); // Обновляем интерфейс (секция истории скроется)
    clearScreen(); // Очищаем данные с экрана
    usernameInput.value = ""; // Очищаем поле ввода
};

// Первичная загрузка истории при открытии страницы
renderHistory();