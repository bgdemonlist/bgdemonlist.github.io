import { byId } from './app-common.js';

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
			'These are the official BG Demon List rules for submitting records, placing levels, and handling difficulty changes.':
				'Това са официалните правила на BG Demon List за изпращане на рекорди, поставяне на нива и промени в трудността.',
			'Submission Rules': 'Правила за изпращане',
			'Video evidence is required for completions.':
				'За completion-и е нужно видео доказателство.',
			'Rare exceptions can be made for old completions if the player is trusted enough.':
				'В редки случаи може да има изключения за стари completion-и, ако играчът е достатъчно trusted.',
			'The video must include clicks, or raw footage with clicks must be provided.':
				'Видеото трябва да има кликове или да бъде предоставен raw footage с кликове.',
			'Records using clickbots or click sound mods will not be accepted.':
				'Рекорди с clickbot-ове или click sound mod-ове няма да бъдат приемани.',
			'For solo 2-player completions, handcam footage is required.':
				'За solo 2-player completion-и е нужен handcam.',
			'Allowed Gameplay': 'Позволен gameplay',
			'Allowed hacks match':
				'Позволените hacks са същите като тези в правилата на',
			Pointercrate: 'Pointercrate',
			"'s rules.": '.',
			"Allowed hacks match Pointercrate's rules.":
				'Позволените hacks са същите като тези в правилата на Pointercrate.',
			'If you are unsure whether something is allowed, ask a list admin.':
				'Ако не сте сигурни дали нещо е позволено, попитайте list admin.',
			'The level must be played on the official copy, not on a personal copy.':
				'Нивото трябва да се играе на официалното копие, а не на лично копие.',
			'Built-in LDMs are allowed.': 'Вградените LDM-и са позволени.',
			'External LDMs or ULDMs must be approved if they remove too much from the level.':
				'External LDM-и или ULDM-и трябва да бъдат одобрени, ако махат твърде много от нивото.',
			'Level Placement': 'Поставяне на нива',
			'Any rated Extreme Demon legitimately completed by a Bulgarian player can be placed on the list.':
				'Всяко rated Extreme Demon ниво, минато legitimately от български играч, може да бъде поставено на листа.',
			'Challenge levels will not be placed.':
				'Challenge нива няма да бъдат поставяни.',
			'Unrated levels can be placed, but they are handled more subjectively and may require a vote.':
				'Unrated нива могат да бъдат поставени, но се разглеждат по-субективно и може да изискват гласуване.',
			'Low-quality levels may be rejected even if they otherwise qualify.':
				'Нива с много ниско качество може да бъдат отказани, дори ако иначе отговарят на условията.',
			'Difficulty Changes': 'Промени в трудността',
			'Victor opinions have priority when they are reliable and based on nearby completions.':
				'Мненията на victor-и имат приоритет, когато са надеждни и базирани на близки completion-и.',
			'If victors disagree, the list placement and the number of trusted opinions are used to decide the change.':
				'Ако victor-ите не са съгласни, позицията в листа и броят trusted мнения се използват за решението.',
			'If a victor has not beaten anything around the level, placement may follow Pointercrate or AREDL until better opinions appear.':
				'Ако victor не е минал нищо около нивото, placement-ът може да следва Pointercrate или AREDL, докато се появят по-надеждни мнения.',
			'If a level has only one victor and later receives a nerfdate, its placement does not change immediately.':
				'Ако ниво има само един victor и по-късно получи nerfdate, placement-ът му не се променя веднага.',
			"After another player beats the nerfed version, the level may be moved based on that player's opinion.":
				'След като друг играч мине nerfed версията, нивото може да бъде преместено според неговото мнение.',
			'Effective Date': 'Дата на влизане в сила',
			'These rules apply from May 23, 2026 onward. Older records may be handled case by case. If you disagree with a decision or need a clarification, use the discussion channel in discord.':
				'Тези правила важат от 23 май 2026 г. нататък. По-старите рекорди може да се разглеждат индивидуално. Ако не сте съгласни с решение или имате нужда от уточнение, използвайте discussion канала в Discord.',
			'Rank:': 'Ранг:',
			'Completions:': 'Completion-и:',
			'Hardest Demon:': 'Най-труден Demon:',
			'Points:': 'Точки:',
			Completions: 'Completion-и',
			Player: 'Играч',
			'Edit Player': 'Редактирай играч',
			Username: 'Потребителско име',
			'Profile Picture (JPG, PNG, WEBP)': 'Профилна снимка (JPG, PNG, WEBP)',
			Province: 'Област',
			"Changing username updates all of this player's records.":
				'Промяната на името обновява всички рекорди на този играч.',
			Cancel: 'Отказ',
			Save: 'Запази',
			'Extreme Demon Roulette': 'Extreme Demon Рулетка',
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
			'Points on completion:': 'Точки при completion:',
			Victors: 'Victor-и',
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
		},
		placeholder: {
			'Search...': 'Търсене...',
			'Search for player...': 'Търсене на играч...',
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

function translateTextElement(element) {
	if (!element || element.closest('#theme-toggle, #language-toggle')) {
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
				? TRANSLATIONS.bg.text[original.key] || original.key
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
		'a, h1, h2, h3, p, li, label, button, option, #start-btn, #submit-btn';
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
