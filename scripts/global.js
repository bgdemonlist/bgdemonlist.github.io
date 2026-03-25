import { byId } from './app-common.js';

const THEME_KEY = 'bdl-theme';
const VALID_THEMES = new Set(['dark', 'light']);

let currentTheme = initializeTheme();

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
highlightActiveNavigation();
watchNavigationChanges();
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
