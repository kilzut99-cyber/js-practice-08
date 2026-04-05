"use strict"; // Включаем строгий режим для предотвращения ошибок

/**
 * Инициализация ссылок на DOM-элементы
 */
const searchBtn = document.getElementById('searchBtn'); // Кнопка Найти
const usernameInput = document.getElementById('username'); // Поле ввода
const loader = document.getElementById('loader'); // Элемент лоадера
const errorDiv = document.getElementById('error'); // Блок вывода ошибок
const profileDiv = document.getElementById('profile'); // Контейнер профиля
const reposList = document.getElementById('repos'); // Список репозиториев
const paginationDiv = document.getElementById('pagination'); // Блок страниц
const autocompleteList = document.getElementById('autocomplete-list'); // Список подсказок

// Переменные состояния приложения
let currentPage = 1; // Текущая активная страница
const reposPerPage = 5; // Лимит репозиториев на страницу 

/**
 * Автокомплит: показывает варианты из истории поиска при наборе текста
 */
usernameInput.addEventListener('input', function() {
    const val = this.value.trim(); // Получаем значение без пробелов
    autocompleteList.innerHTML = ""; // Очищаем список подсказок
    if (!val) return;

    const history = JSON.parse(localStorage.getItem('gh_spy_history') || "[]"); // Берем историю из памяти
    const matches = history.filter(name => name.toLowerCase().startsWith(val.toLowerCase())); // Ищем совпадения

    matches.forEach(name => {
        const div = document.createElement('div'); // Создаем элемент подсказки
        div.textContent = name;
        div.onclick = () => {
            usernameInput.value = name; // Подставляем имя при клике
            autocompleteList.innerHTML = ""; // Скрываем список
            handleSearch(); // Запускаем поиск
        };
        autocompleteList.appendChild(div); // Добавляем в выпадающий список
    });
});

/**
 * ГЛАВНАЯ ФУНКЦИЯ ЗАПРОСА
 * ПОЧЕМУ Promise.all? — Позволяет запустить запрос профиля и репозиториев одновременно для скорости.
 */
async function fetchData(username, page = 1) {
    toggleUI(true); // Включаем Loader и блокируем кнопки
    clearScreen(); // Очищаем экран перед новым выводом

    try {
        // Запускаем два fetch параллельно
        const [resUser, resRepos] = await Promise.all([
            fetch(`https://api.github.com/users/${username}`),
            fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=${reposPerPage}&page=${page}`)
        ]);

        /**
         * ПОЧЕМУ !response.ok? — fetch не считает 404 ошибкой, нужно проверять статус вручную.
         */
        if (!resUser.ok) {
            if (resUser.status === 404) throw new Error("Пользователь не найден");
            throw new Error(`Ошибка GitHub: ${resUser.status}`);
        }

        const userData = await resUser.json(); // Данные профиля
        const reposData = await resRepos.json(); // Данные репозиториев

        renderProfile(userData); // Отрисовка карточки
        renderRepos(reposData, userData.public_repos, username); // Отрисовка списка
        saveHistory(username); // Сохранение в localStorage

    } catch (err) {
        /**
         * ПОЧЕМУ try...catch? — Единственный надежный способ перехватить ошибки сети или API.
         */
        showError(err.message);
    } finally {
        toggleUI(false); // Всегда выключаем лоадер в конце
    }
}

/**
 * ТАБУ: Используем createElement и textContent вместо innerHTML для защиты от XSS 
 */
function renderProfile(user) {
    profileDiv.innerHTML = ""; // Очистка
    
    const avatar = document.createElement('img'); // Создаем аватар
    avatar.src = user.avatar_url;
    avatar.style.width = "80px"; avatar.style.borderRadius = "50%";

    const name = document.createElement('h2'); // Создаем заголовок с именем
    name.textContent = user.name || user.login;

    const bio = document.createElement('p'); // Создаем био
    bio.textContent = user.bio || "Описание отсутствует";

    profileDiv.append(avatar, name, bio); // Собираем карточку
    document.getElementById('profile-section').classList.remove('hidden');
}

/**
 * Отрисовка репозиториев и звезд 
 */
function renderRepos(repos, total, user) {
    reposList.innerHTML = ""; // Очистка
    
    repos.forEach(repo => {
        const li = document.createElement('li'); // Создаем элемент списка
        li.className = "repo-item";
        li.innerHTML = `
            <a href="${repo.html_url}" target="_blank">${repo.name}</a>
            <p style="font-size: 14px; color: #57606a;">${repo.description || ""}</p>
            <div><span class="star-icon">★</span>${repo.stargazers_count}</div>
        `;
        reposList.append(li); // Добавляем в <ul>
    });

    renderPagination(total, user); // Вызов пагинации
    document.getElementById('repos-section').classList.remove('hidden');
}

/**
 * Отрисовка пагинации 
 */
function renderPagination(total, user) {
    paginationDiv.innerHTML = "";
    const pages = Math.ceil(total / reposPerPage); // Считаем количество страниц
    if (pages <= 1) return;

    for (let i = 1; i <= Math.min(pages, 10); i++) {
        const btn = document.createElement('button'); // Создаем кнопку страницы
        btn.textContent = i;
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        btn.onclick = () => {
            currentPage = i;
            fetchData(user, i); // Переход по страницам
        };
        paginationDiv.append(btn); // Добавляем кнопку
    }
}

/**
 * Работа с историей (localStorage)
 */
function saveHistory(u) {
    let h = JSON.parse(localStorage.getItem('gh_spy_history') || "[]");
    if (!h.includes(u)) {
        h.unshift(u); // Добавляем в начало
        if (h.length > 3) h.pop(); // Храним только 3 записи 
        localStorage.setItem('gh_spy_history', JSON.stringify(h)); // Сохраняем в память
        renderHistory();
    }
}

function renderHistory() {
    const h = JSON.parse(localStorage.getItem('gh_spy_history') || "[]");
    const container = document.getElementById('history');
    container.innerHTML = "";
    
    h.forEach(name => {
        const btn = document.createElement('button'); // Создаем овальный тег
        btn.className = "history-tag-btn";
        btn.textContent = name;
        btn.onclick = () => {
            usernameInput.value = name;
            handleSearch();
        };
        container.append(btn);
    });
    // Скрываем секцию истории, если в памяти пусто
    document.getElementById('history-section').classList.toggle('hidden', !h.length);
}

/**
 * Вспомогательные функции управления экраном
 */
function toggleUI(isLoading) {
    searchBtn.disabled = isLoading; // Блокировка кнопки поиска
    loader.classList.toggle('hidden', !isLoading);
}

function clearScreen() {
    errorDiv.classList.add('hidden'); // Скрываем ошибки
    document.getElementById('profile-section').classList.add('hidden'); // Скрываем профиль
    document.getElementById('repos-section').classList.add('hidden'); // Скрываем репозитории
    autocompleteList.innerHTML = ""; // Скрываем подсказки
}

function showError(msg) {
    errorDiv.textContent = msg; // Записываем текст ошибки
    errorDiv.classList.remove('hidden'); // Показываем блок
}

function handleSearch() {
    const user = usernameInput.value.trim();
    if (user) {
        currentPage = 1; // Сброс страницы при новом поиске
        fetchData(user);
    }
}

// Слушатель отправки формы (по кнопке или Enter)
document.getElementById('search-form').onsubmit = (e) => {
    e.preventDefault();
    handleSearch();
};

// Исправленная логика кнопки Очистить: удаляет память и очищает экран
document.getElementById('clearHistory').onclick = () => {
    localStorage.removeItem('gh_spy_history'); // Полное удаление из localStorage
    renderHistory(); // Перерисовка блока истории (он скроется)
    clearScreen(); // Очистка репозиториев и профиля с экрана
    usernameInput.value = ""; // Очистка поля ввода
};

// Загрузка истории при первом открытии страницы
renderHistory();