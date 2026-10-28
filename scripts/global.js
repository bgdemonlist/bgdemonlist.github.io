// Intentionally has no imports: importing app-common.js would make this script wait for the
// whole Firebase SDK to download before applying the theme and translations.
const byId = (id) => document.getElementById(id);

const THEME_KEY = 'bdl-theme';
const LANGUAGE_KEY = 'bdl-language';
const VALID_THEMES = new Set(['dark', 'light']);
const VALID_LANGUAGES = new Set(['en', 'bg']);

const TRANSLATIONS = {
	bg: {
		text: {
			Admin: 'Админ',
			Roulette: 'Рулетка',
			Leaderboard: 'Класация',
			Guidelines: 'Правила',
			'BG Demon Roulette': 'BG Demon Рулетка',
			'BG Demon List': 'BG Demon List',
			'Rank:': 'Ранг:',
			'Completions:': 'Completion-и:',
			'Hardest Demon:': 'Най-труден Demon:',
			'Points:': 'Точки:',
			'Players:': 'Играчи:',
			Completions: 'Completion-и',
			Player: 'Играч',
			'Edit Player': 'Редактирай играч',
			'Delete Player': 'Изтрий играч',
			'First Victor': 'Първи victor',
			'Edit Level': 'Редактирай ниво',
			Username: 'Потребителско име',
			'Profile Picture (JPG, PNG, WEBP)': 'Профилна снимка (JPG, PNG, WEBP)',
			Province: 'Област',
			"Changing username updates all of this player's records.":
				'Промяната на името обновява всички рекорди на този играч.',
			Cancel: 'Отказ',
			Save: 'Запази',
			'Extreme Demon Roulette': 'Extreme Demon Рулетка',
			'Play through randomized extreme demons with progressive percentage requirements (1% to 100%).':
				'Играйте произволни extreme demon нива с нарастващо процентно изискване (1% до 100%).',
			'Loading Levels...': 'Зареждане на нива...',
			'Start Roulette': 'Старт на рулетката',
			'No Levels Available': 'Няма налични нива',
			'Failed to Load Levels': 'Нивата не се заредиха',
			'Load Save File': 'Зареди save файл',
			'Round:': 'Рунд:',
			'Requirement:': 'Изискване:',
			'Percentage Achieved:': 'Постигнат процент:',
			NEXT: 'НАПРЕД',
			'Save Game': 'Запази играта',
			'Give Up': 'Предай се',
			'Run History': 'История на run-а',
			'Run Summary': 'Обобщение на run-а',
			'Here are the results of your roulette run.': 'Ето резултатите от вашата рулетка.',
			'Start New Roulette': 'Започни нова рулетка',
			'Completed Levels': 'Завършени нива',
			'Remaining Levels': 'Оставащи нива',
			'Run Ended': 'Край на run-а',
			'Congratulations! Run Completed!': 'Поздравления! Run-ът е завършен!',
			Remaining: 'Оставащо',
			'All levels in the queue were completed.': 'Всички нива в опашката бяха завършени.',
			'No levels were completed in this run.': 'В този run няма завършени нива.',
			'Points on completion:': 'Точки при completion:',
			'Points (100%):': 'Точки (100%):',
			'published by': 'публикувано от',
			points: 'точки',
			Victors: 'Victor-и',
			Records: 'Рекорди',
			'Record Holder': 'Играч',
			Progress: 'Прогрес',
			'Video Proof': 'Видео',
			'100% required to qualify': 'Изисква се 100% за квалификация',
			'Add Level': 'Добави ниво',
			'Remove Level': 'Премахни ниво',
			'Add Record': 'Добави рекорд',
			Holder: 'Играч',
			'No records yet...': 'Все още няма рекорди...',
			Delete: 'Изтрий',
			'Level not found': 'Нивото не е намерено',
			'Invalid or missing position.': 'Невалидна или липсваща позиция.',
			'No levels are available right now.': 'В момента няма налични нива.',
			'Something went wrong while loading this page.':
				'Нещо се обърка при зареждането на страницата.',
			'No players yet': 'Все още няма играчи',
			'No province': 'Няма област',
			Submit: 'Изпрати',
			All: 'Всички',
			'Level Packs': 'Пакети с нива',
			'Level Packs:': 'Пакети с нива:',
			'View All Packs': 'Виж всички пакети',
			'View all level packs': 'Виж всички пакети',
			'Completed Packs': 'Завършени пакети',
			'No completed packs yet': 'Все още няма завършени пакети',
			'No level packs available yet.': 'Все още няма налични пакети с нива.',
			'No level packs created yet.': 'Все още няма създадени пакети с нива.',
			'Manage Level Packs': 'Управление на пакети с нива',
			'Pack Tiers': 'Категории пакети',
			'Manage Tiers': 'Управление на категории',
			'Create Tier': 'Създай категория',
			'Edit Tier': 'Редактирай категория',
			'Tier Name': 'Име на категорията',
			'Tier Color': 'Цвят на категорията',
			'Pack Tier': 'Категория на пакета',
			'No Tier': 'Без категория',
			'Bonus Points': 'Бонус точки',
			'pts bonus': 'т. бонус',
			'Create Level Pack': 'Създай пакет с нива',
			'Edit Level Pack': 'Редактирай пакет с нива',
			'Pack Name': 'Име на пакета',
			'Pack Color': 'Цвят на пакета',
			'Select Levels': 'Избери нива',
			'Levels Included': 'Включени нива',
			Players: 'Играчи',
			Provinces: 'Области',
			'Unique Levels:': 'Уникални нива:',
			'Unique Levels Beaten': 'Уникални минати нива',
			'Players in Province': 'Играчи в областта',
			'No provinces': 'Няма области',
			'unique level': 'уникално ниво',
			'unique levels': 'уникални нива',
			player: 'играч',
			players: 'играчи',
			pts: 'т.',
			'Sign Out': 'Изход',
			'Admin Panel': 'Админ панел',
			'Admin Login': 'Админ вход',
			'Email': 'Имейл',
			'Password': 'Парола',
			'Login': 'Вход',
			'Edit': 'Редактирай',
			'Edit Guidelines': 'Редактирай правилата',
			'Write': 'Редакция',
			'Preview': 'Преглед',
			'Saving...': 'Запазване...',
		},
		placeholder: {
			'Search...': 'Търсене...',
			'Search for player...': 'Търсене на играч...',
			'Search for province...': 'Търсене на област...',
			'Level Name...': 'Име на ниво...',
			'Creator Name...': 'Име на създател...',
			'Video Link...': 'Видео линк...',
			'Posiiton...': 'Позиция...',
			'Holder Name...': 'Име на играч...',
		},
	},
};

const originalTextNodes = new WeakMap();
const originalDocumentTitle = document.title;
let currentTheme = initializeTheme();
let currentLanguage = initializeLanguage();

const logo = byId('logo');
const logoLink = logo?.querySelector('a');

if (logoLink) {
	logoLink.dataset.logoText = logoLink.textContent?.trim() || 'BDL';
}

if (logo) {
	logo.addEventListener('click', () => {
		location.href = 'index.html';
	});
}

setupThemeToggle();
setupLanguageToggle();
translatePage();
if (!byId('guidelines-container')) {
	delete document.documentElement.dataset.i18nPending;
}
highlightActiveNavigation();
watchNavigationChanges();
watchPageTranslations();
watchSystemTheme();

function initializeTheme() {
	const stored = readStoredTheme();
	if (stored) {
		return applyTheme(stored);
	}

	return applyTheme(getSystemTheme());
}

function getSystemTheme() {
	return window.matchMedia('(prefers-color-scheme: light)').matches
		? 'light'
		: 'dark';
}

function readStoredTheme() {
	try {
		const value = localStorage.getItem(THEME_KEY);
		return VALID_THEMES.has(value) ? value : null;
	} catch {
		return null;
	}
}

function writeStoredTheme(theme) {
	try {
		localStorage.setItem(THEME_KEY, theme);
	} catch {
		// Ignore unavailable storage in private browsing contexts.
	}
}

function applyTheme(theme) {
	const safeTheme = VALID_THEMES.has(theme) ? theme : 'dark';
	document.documentElement.dataset.theme = safeTheme;
	return safeTheme;
}

function formatThemeLabel(theme) {
	return theme === 'light' ? 'Light' : 'Dark';
}

function setupThemeToggle() {
	const header = document.querySelector('header');
	if (!header) {
		return;
	}

	let actions = header.querySelector('.header-actions');
	if (!actions) {
		actions = document.createElement('div');
		actions.className = 'header-actions';
		header.append(actions);
	}

	let toggle = byId('theme-toggle');
	if (!toggle) {
		toggle = document.createElement('button');
		toggle.id = 'theme-toggle';
		toggle.type = 'button';
		actions.append(toggle);
	}

	renderThemeToggle(toggle);

	toggle.addEventListener('click', () => {
		currentTheme = currentTheme === 'light' ? 'dark' : 'light';
		currentTheme = applyTheme(currentTheme);
		writeStoredTheme(currentTheme);
		renderThemeToggle(toggle);
	});
}

function initializeLanguage() {
	const stored = readStoredLanguage();
	return applyLanguage(stored || 'en');
}

function readStoredLanguage() {
	try {
		const value = localStorage.getItem(LANGUAGE_KEY);
		return VALID_LANGUAGES.has(value) ? value : null;
	} catch {
		return null;
	}
}

function writeStoredLanguage(language) {
	try {
		localStorage.setItem(LANGUAGE_KEY, language);
	} catch {
		// Ignore unavailable storage in private browsing contexts.
	}
}

function applyLanguage(language) {
	const safeLanguage = VALID_LANGUAGES.has(language) ? language : 'en';
	document.documentElement.lang = safeLanguage === 'bg' ? 'bg' : 'en';
	document.documentElement.dataset.language = safeLanguage;
	return safeLanguage;
}

function setupLanguageToggle() {
	const header = document.querySelector('header');
	if (!header) {
		return;
	}

	let actions = header.querySelector('.header-actions');
	if (!actions) {
		actions = document.createElement('div');
		actions.className = 'header-actions';
		header.append(actions);
	}

	let toggle = byId('language-toggle');
	if (!toggle) {
		toggle = document.createElement('button');
		toggle.id = 'language-toggle';
		toggle.type = 'button';
		actions.prepend(toggle);
	}

	renderLanguageToggle(toggle);

	toggle.addEventListener('click', () => {
		currentLanguage = currentLanguage === 'bg' ? 'en' : 'bg';
		currentLanguage = applyLanguage(currentLanguage);
		writeStoredLanguage(currentLanguage);
		renderLanguageToggle(toggle);
		translatePage();
	});
}

function renderLanguageToggle(button) {
	if (!button) {
		return;
	}

	const nextLanguage = currentLanguage === 'bg' ? 'English' : 'Bulgarian';
	const label = currentLanguage === 'bg' ? 'EN' : 'BG';
	if (button.textContent !== label) {
		button.textContent = label;
	}
	button.setAttribute('aria-label', `Switch to ${nextLanguage}`);
	button.title = `Switch to ${nextLanguage}`;
}

function renderThemeToggle(button) {
	if (!button) {
		return;
	}

	const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
	const iconClass =
		currentTheme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
	button.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i>`;
	button.setAttribute(
		'aria-label',
		`Switch to ${formatThemeLabel(nextTheme).toLowerCase()} theme`,
	);
	button.title = `Switch to ${formatThemeLabel(nextTheme)} theme`;
}

function normalizeText(value) {
	return String(value || '').replace(/\s+/g, ' ').trim();
}

function getBgTextTranslation(key) {
	if (TRANSLATIONS.bg.text[key]) {
		return TRANSLATIONS.bg.text[key];
	}

	const provinceMatch = key.match(/^Beaten by (\d+) players? in this province:$/);
	if (provinceMatch) {
		const count = Number(provinceMatch[1]);
		return `Минато от ${count} ${count === 1 ? 'играч' : 'играчи'} в тази област:`;
	}

	const victorsMatch = key.match(/^(\d+) victors?$/i);
	if (victorsMatch) {
		const count = Number(victorsMatch[1]);
		return `${count} ${count === 1 ? 'рекорд' : 'рекорда'}`;
	}

	const byCreatorMatch = key.match(/^(?:By|published by) (.+)$/);
	if (byCreatorMatch) {
		return `публикувано от ${byCreatorMatch[1]}`;
	}

	return key;
}

function translateTextElement(element) {
	if (!element || element.closest('#theme-toggle, #language-toggle, [data-i18n-ignore]')) {
		return;
	}

	element.childNodes.forEach((node) => {
		if (node.nodeType !== Node.TEXT_NODE) {
			return;
		}

		if (!originalTextNodes.has(node)) {
			const key = normalizeText(node.nodeValue);
			if (!key) {
				return;
			}

			originalTextNodes.set(node, {
				key,
				raw: node.nodeValue,
			});
		}

		const original = originalTextNodes.get(node);
		const translated =
			currentLanguage === 'bg'
				? getBgTextTranslation(original.key)
				: original.raw;
		const suffix = /\s$/.test(original.raw) && currentLanguage === 'bg' ? ' ' : '';
		const value = currentLanguage === 'bg' ? translated + suffix : translated;

		if (node.nodeValue !== value) {
			node.nodeValue = value;
		}
	});
}

function translatePlaceholderElement(element) {
	if (!element || !('placeholder' in element)) {
		return;
	}

	if (!element.dataset.i18nOriginalPlaceholder) {
		const original = element.getAttribute('placeholder');
		if (!original) {
			return;
		}

		element.dataset.i18nOriginalPlaceholder = original;
	}

	const original = element.dataset.i18nOriginalPlaceholder;
	const translated =
		currentLanguage === 'bg'
			? TRANSLATIONS.bg.placeholder[original] || original
			: original;

	if (element.getAttribute('placeholder') !== translated) {
		element.setAttribute('placeholder', translated);
	}
}

function translatePage() {
	document.title =
		currentLanguage === 'bg'
			? TRANSLATIONS.bg.text[originalDocumentTitle] || originalDocumentTitle
			: originalDocumentTitle;
	const textSelector =
		'a, h1, h2, h3, p, li, label, button, option, span, #start-btn, #submit-btn';
	document.querySelectorAll(textSelector).forEach(translateTextElement);
	document
		.querySelectorAll('input[placeholder], textarea[placeholder]')
		.forEach(translatePlaceholderElement);
	renderLanguageToggle(byId('language-toggle'));
}

function watchPageTranslations() {
	const observer = new MutationObserver(() => {
		translatePage();
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});
}

function normalizePath(pathname) {
	const trimmed = String(pathname || '').trim();
	if (!trimmed || trimmed === '/') {
		return 'index.html';
	}

	const segments = trimmed.split('/').filter(Boolean);
	const lastSegment = segments[segments.length - 1];
	return lastSegment || 'index.html';
}

function highlightActiveNavigation() {
	const navLinks = byId('nav_links');
	if (!navLinks) {
		return;
	}

	const currentPage = normalizePath(window.location.pathname);
	const links = navLinks.querySelectorAll('a');

	links.forEach((link) => {
		const href = link.getAttribute('href') || '';
		const resolvedPath = normalizePath(new URL(href, window.location.href).pathname);
		const isActive = resolvedPath === currentPage;

		link.classList.toggle('active-link', isActive);
		if (isActive) {
			link.setAttribute('aria-current', 'page');
		} else {
			link.removeAttribute('aria-current');
		}
	});
}

function watchNavigationChanges() {
	const navLinks = byId('nav_links');
	if (!navLinks) {
		return;
	}

	const observer = new MutationObserver(() => {
		highlightActiveNavigation();
	});

	observer.observe(navLinks, {
		childList: true,
		subtree: true,
	});
}

function watchSystemTheme() {
	const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
	const updateTheme = (event) => {
		if (readStoredTheme()) {
			return;
		}

		currentTheme = applyTheme(event.matches ? 'light' : 'dark');
		renderThemeToggle(byId('theme-toggle'));
	};

	if (typeof mediaQuery.addEventListener === 'function') {
		mediaQuery.addEventListener('change', updateTheme);
		return;
	}

	if (typeof mediaQuery.addListener === 'function') {
		mediaQuery.addListener(updateTheme);
	}
}
