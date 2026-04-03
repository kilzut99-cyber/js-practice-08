"use strict"; // Включает строгий режим для предотвращения распространенных ошибок и использования современных стандартов JS

// TODO: Получить ссылки на DOM-элементы
const searchForm = document.getElementById("search-form"); // Ссылка на форму для перехвата события отправки (submit)
const usernameInput = document.getElementById("username"); // Ссылка на поле ввода, где пользователь пишет логин
const searchBtn = document.getElementById("searchBtn"); // Ссылка на кнопку поиска для управления её состоянием (активна/неактивна)
const errorDiv = document.getElementById("error"); // Ссылка на блок, в который будут выводиться сообщения об ошибках
const loader = document.getElementById("loader"); // Ссылка на индикатор загрузки для управления его видимостью
const profileSection = document.getElementById("profile-section"); // Ссылка на контейнер секции профиля
const profileDiv = document.getElementById("profile"); // Ссылка на конкретный блок внутри профиля для отрисовки карточки
const reposSection = document.getElementById("repos-section"); // Ссылка на контейнер секции репозиториев
const reposList = document.getElementById("repos"); // Ссылка на элемент списка <ul> для добавления проектов
const historySection = document.getElementById("history-section"); // Ссылка на секцию истории поиска
const historyDiv = document.getElementById("history"); // Ссылка на контейнер, где будут создаваться кнопки-теги
const clearHistoryBtn = document.getElementById("clearHistory"); // Ссылка на кнопку для полной очистки истории из памяти

// TODO: Функция для получения данных профиля пользователя
async function getUser(username) {
  // ПОЧЕМУ async/await? — Позволяет писать асинхронный код как синхронный, проще читать и понимать последовательность действий.
  // ПОЧЕМУ try/catch? — Для обработки ошибок сети (например, пропал интернет) и исключений, которые нельзя поймать иначе.
  // ПОЧЕМУ проверяем response.ok? — fetch не выбрасывает ошибку при статусе 404 (не найден), поэтому статус нужно проверять вручную.
  const response = await fetch(`https://github.com{username}`); // Выполняем сетевой запрос к API GitHub для получения данных юзера
  if (!response.ok) {
    // Если ответ от сервера не успешный (статус не 200-299)
    if (response.status === 404) throw new Error("Пользователь не найден"); // Если код 404, генерируем понятную ошибку
    throw new Error("Ошибка при загрузке профиля"); // Для других кодов ошибок генерируем общее сообщение
  }
  return await response.json(); // Декодируем ответ из формата JSON в объект JavaScript
}

// TODO: Функция для получения репозиториев пользователя
async function getRepos(username) {
  // Аналогично getUser, fetch репозиториев
  const response = await fetch(
    `https://github.com{username}/repos?sort=updated&per_page=5`,
  ); // Запрашиваем 5 последних обновленных проектов
  if (!response.ok) throw new Error("Не удалось загрузить репозитории"); // Если запрос провалился, генерируем исключение
  return await response.json(); // Возвращаем массив объектов репозиториев
}

// TODO: Функция для отображения профиля
function renderProfile(data) {
  // Создайте элементы через createElement, вставьте данные через textContent
  // Не используйте innerHTML для данных от API! (Это критически важно для защиты от XSS-уязвимостей)
  profileDiv.innerHTML = ""; // Очищаем контейнер от результатов предыдущего поиска

  const avatar = document.createElement("img"); // Создаем новый элемент изображения
  avatar.src = data.avatar_url; // Указываем путь к картинке аватара
  avatar.alt = data.login; // Устанавливаем альтернативный текст для доступности

  const info = document.createElement("div"); // Создаем контейнер для текстовой информации
  info.className = "profile-info"; // Присваиваем класс для правильного отображения стилей из CSS

  const name = document.createElement("h2"); // Создаем заголовок для имени пользователя
  name.textContent = data.name || data.login; // Отображаем полное имя, а если его нет — логин (через безопасный textContent)

  const bio = document.createElement("p"); // Создаем абзац для описания (био) профиля
  bio.textContent = data.bio || "У этого пользователя нет описания профиля"; // Пишем био или текст-заглушку

  info.append(name, bio); // Вкладываем имя и описание в текстовый блок
  profileDiv.append(avatar, info); // Вкладываем аватар и текст в основную карточку профиля
  profileSection.classList.remove("hidden"); // Удаляем класс hidden, чтобы секция стала видимой
}

// TODO: Функция для отображения репозиториев
function renderRepos(repos) {
  // Создайте список li с ссылками и описаниями
  reposList.innerHTML = ""; // Полностью очищаем старый список проектов
  repos.forEach((repo) => {
    // Проходимся циклом по каждому репозиторию из массива
    const li = document.createElement("li"); // Создаем элемент списка (строку)
    const a = document.createElement("a"); // Создаем элемент ссылки
    a.href = repo.html_url; // Устанавливаем адрес ссылки на страницу проекта в GitHub
    a.target = "_blank"; // Настраиваем открытие ссылки в новой вкладке браузера
    a.textContent = repo.name; // Указываем название репозитория как текст ссылки
    li.append(a); // Помещаем ссылку внутрь элемента списка
    reposList.append(li); // Добавляем готовый элемент в общий список на странице
  });
  reposSection.classList.remove("hidden"); // Показываем секцию с заголовком "Последние репозитории"
}

// TODO: Функция для отображения ошибок
function showError(message) {
  errorDiv.textContent = message; // Записываем текст ошибки в блок
  errorDiv.classList.remove("hidden"); // Убираем класс скрытия, чтобы пользователь увидел ошибку
}

// TODO: Функция для очистки ошибок
function clearError() {
  errorDiv.textContent = ""; // Стираем текст ошибки
  errorDiv.classList.add("hidden"); // Добавляем класс скрытия обратно
}

// TODO: Функция для управления loader
function showLoader() {
  loader.classList.remove("hidden"); // Показываем индикатор загрузки на экране
}
function hideLoader() {
  loader.classList.add("hidden"); // Скрываем индикатор загрузки с экрана
}

// TODO: Обработчик формы поиска
searchForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // Останавливаем стандартную перезагрузку страницы при отправке формы
  clearError(); // Сбрасываем старые ошибки перед началом нового поиска
  profileSection.classList.add("hidden"); // Скрываем старые данные профиля
  reposSection.classList.add("hidden"); // Скрываем старые данные репозиториев

  const username = usernameInput.value.trim(); // Считываем имя из инпута и удаляем лишние пробелы по краям
  if (!username) {
    // Если пользователь нажал "Найти" при пустом поле
    showError("Введите имя пользователя GitHub"); // Выводим предупреждение
    return; // Завершаем выполнение функции
  }

  searchBtn.disabled = true; // Выключаем кнопку поиска на время выполнения запросов
  showLoader(); // Включаем индикатор загрузки

  // TODO: Вызвать getUser и getRepos, отрисовать данные, обработать ошибки
  try {
    // ПОЧЕМУ Promise.all? — Мы запускаем запросы профиля и репозиториев одновременно, что ускоряет работу приложения.
    const [userData, reposData] = await Promise.all([
      getUser(username),
      getRepos(username),
    ]);
    renderProfile(userData); // Если оба запроса успешны, отрисовываем карточку профиля
    renderRepos(reposData); // Отрисовываем список последних 5 проектов
    saveToHistory(username); // Добавляем успешно найденное имя в историю поиска
  } catch (err) {
    // Если на любом этапе возникла ошибка (404 или нет сети)
    showError(err.message); // Показываем пользователю понятное сообщение об ошибке
  } finally {
    // Этот блок выполнится всегда: и при успехе, и при ошибке
    hideLoader(); // В любом случае выключаем лоадер
    searchBtn.disabled = false; // В любом случае возвращаем кнопку поиска в активное состояние
  }
});

// TODO: Функции для работы с историей поиска в localStorage
function saveToHistory(username) {
  let history = JSON.parse(localStorage.getItem("gh_history")) || []; // Извлекаем историю из памяти или создаем пустой массив
  if (!history.includes(username)) {
    // Проверяем, нет ли уже этого имени в истории (избегаем дублей)
    history.unshift(username); // Добавляем новое имя в самое начало массива
    history = history.slice(0, 3); // Согласно ТЗ, оставляем только 3 последних поисковых запроса
    localStorage.setItem("gh_history", JSON.stringify(history)); // Сохраняем массив обратно в localStorage в виде строки
    renderHistory(); // Перерисовываем блок истории на странице
  }
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem("gh_history")) || []; // Получаем список имен из памяти браузера
  if (history.length === 0) {
    // Если в истории пока ничего нет
    historySection.classList.add("hidden"); // Скрываем всю секцию истории
    return; // Выходим из функции
  }
  historyDiv.innerHTML = ""; // Очищаем контейнер от старых кнопок истории
  history.forEach((user) => {
    // Для каждого имени в сохраненной истории создаем кнопку
    const btn = document.createElement("button"); // Создаем элемент кнопки
    btn.textContent = user; // Устанавливаем логин как текст на кнопке
    btn.onclick = () => {
      // Назначаем действие при клике на тег истории
      usernameInput.value = user; // Подставляем имя из тега в поле ввода
      searchForm.dispatchEvent(new Event("submit")); // Программно вызываем событие отправки формы (поиск)
    };
    historyDiv.append(btn); // Добавляем готовую кнопку-тег в контейнер
  });
  historySection.classList.remove("hidden"); // Делаем секцию истории видимой на странице
}

clearHistoryBtn.onclick = () => {
  // Обработчик для кнопки "Очистить историю"
  localStorage.removeItem("gh_history"); // Полностью удаляем ключ с историей из памяти браузера
  renderHistory(); // Снова вызываем отрисовку, которая теперь скроет секцию
};

// TODO: Инициализация приложения — загрузка истории и др.
renderHistory(); // При самой первой загрузке страницы проверяем, есть ли что-то в истории, и отрисовываем её
