import {
	onValue,
	ref,
	set,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { auth, byId, db, initAuthNavigation } from './app-common.js';

const STORAGE_KEYS = {
	en: 'bdl-guidelines-md-en',
	bg: 'bdl-guidelines-md-bg',
};

const DEFAULT_SECTION_ICONS = [
	'fa-trophy',
	'fa-shield-halved',
	'fa-list-check',
	'fa-scale-balanced',
	'fa-calendar-check',
];

const DEFAULT_MARKDOWN = {
	en: `# Guidelines
These are the official BG Demon List rules for submitting records, placing levels, and handling difficulty changes.

## [fa-trophy] Submission Rules
- Video evidence is required for completions.
- Rare exceptions can be made for old completions if the player is trusted enough.
- The video must include clicks, or raw footage with clicks must be provided.
- Records using clickbots or click sound mods will not be accepted.
- For solo 2-player completions, handcam footage is required.
- Completions with AI-generated thumbnails on the completion video will not be accepted.

## [fa-shield-halved] Gameplay
- Allowed hacks match [Pointercrate](https://docs.google.com/spreadsheets/d/1evE4nXATxRAQWu2Ajs54E6cVUqHBoSid8I7JauJnOzg/edit?gid=0#gid=0)'s rules.
- If you are unsure whether something is allowed, ask a list admin.
- The level must be played on the official copy, not on a personal copy.
- Built-in LDMs are allowed.
- External LDMs or ULDMs must be approved if they remove too much from the level.

## [fa-list-check] Level Placement
- Any rated Extreme Demon legitimately completed by a Bulgarian player can be placed on the list.
- Challenge levels will not be placed.
- Unrated levels can be placed, but they are handled more subjectively and may require a vote.
- Low-quality levels may be rejected even if they otherwise qualify.

## [fa-scale-balanced] Difficulty Changes
- Victor opinions have priority when they are reliable and based on nearby completions.
- If victors disagree, the list placement and the number of trusted opinions are used to decide the change.
- If a victor has not beaten anything around the level, placement may follow Pointercrate or AREDL until better opinions appear.
- If a level has only one victor and later receives a nerfdate, its placement does not change immediately.
- After another player beats the nerfed version, the level may be moved based on that player's opinion.

## [fa-calendar-check] Effective Date
These rules apply from October 12, 2026 onward. Older records may be handled case by case. If you disagree with a decision or need a clarification, use the discussion channel in discord.`,

	bg: `# Правила
Това са официалните правила на BG Demon List за добавяне на рекорди, поставяне на нива и промени в трудността.

## [fa-trophy] Правила за добавяне на рекорди
- За completion-и е нужно видео доказателство.
- В редки случаи може да има изключения за стари completion-и, ако играчът е достатъчно trusted.
- Видеото трябва да има кликове или да бъде предоставен raw footage с кликове.
- Рекорди с clickbot-ове или click sound mod-ове няма да бъдат приемани.
- За solo 2-player completion-и е нужен handcam.
- Completion-и с AI-генериран thumbnail на видеото няма да бъдат приемани.

## [fa-shield-halved] Позволен gameplay
- Позволените хакове са същите като тези в правилата на [Pointercrate](https://docs.google.com/spreadsheets/d/1evE4nXATxRAQWu2Ajs54E6cVUqHBoSid8I7JauJnOzg/edit?gid=0#gid=0).
- Ако не сте сигурни дали нещо е позволено, попитайте list admin.
- Нивото трябва да се играе на официалното копие, а не на лично копие.
- Вградените LDM-и са позволени.
- External LDM-и или ULDM-и трябва да бъдат одобрени, ако махат твърде много от нивото.

## [fa-list-check] Поставяне на нива
- Всяко rated Extreme Demon ниво, минато legitimately от български играч, може да бъде поставено на листа.
- Challenge нива няма да бъдат поставяни.
- Unrated нива могат да бъдат поставени, но се разглеждат по-субективно и може да изискват гласуване.
- Нива с много ниско качество може да бъдат отказани, дори ако иначе отговарят на условията.

## [fa-scale-balanced] Промени в позицията
- Мненията на victor-и имат приоритет, когато са надеждни и базирани на близки completion-и.
- Ако victor-ите не са съгласни, позицията в листа и броят trusted мнения се използват за решението.
- Ако victor не е минал нищо около нивото, placement-ът може да следва Pointercrate или AREDL, докато се появят по-надеждни мнения.
- Ако ниво има само един victor и по-късно получи nerfdate, placement-ът му не се променя веднага.
- След като друг играч мине nerfed версията, нивото може да бъде преместено според неговото мнение.

## [fa-calendar-check] Дата на влизане в сила
Тези правила важат от 12 октомври 2026 г. нататък. По-старите рекорди може да се разглеждат индивидуално. Ако не сте съгласни с решение или имате нужда от уточнение, използвайте discussion канала в Discord.`,
};

// Page elements
const heroContentEl = byId('guidelines-hero-content');
const sheetEl = byId('guidelines-sheet');
const editBtn = byId('edit-guidelines-btn');

// Modal elements
const modalOverlay = byId('edit-guidelines-overlay');
const modalCloseBtn = byId('edit-guidelines-close');
const modalForm = byId('edit-guidelines-form');
const markdownInput = byId('guidelines-markdown-input');
const editorPane = byId('guidelines-editor-pane');
const previewPane = byId('guidelines-preview-pane');
const previewHeroEl = byId('guidelines-preview-hero');
const previewSheetEl = byId('guidelines-preview-sheet');
const syntaxHelpEl = byId('guidelines-syntax-help');
const tabWriteBtn = byId('guidelines-tab-write');
const tabPreviewBtn = byId('guidelines-tab-preview');
const fileTabBtns = document.querySelectorAll('.guidelines-file-tab');
const cancelBtn = byId('edit-guidelines-cancel');
const saveBtn = byId('edit-guidelines-save');
const errorEl = byId('edit-guidelines-error');

const guidelinesMarkdown = {
	en: readCachedMarkdown('en') || DEFAULT_MARKDOWN.en,
	bg: readCachedMarkdown('bg') || DEFAULT_MARKDOWN.bg,
};

let draftMarkdown = {
	en: guidelinesMarkdown.en,
	bg: guidelinesMarkdown.bg,
};

let activeEditorLang = getCurrentPageLanguage();
let activeEditorMode = 'write';
let isSignedIn = false;
let isSaving = false;

// Initialize navigation & auth
initAuthNavigation();

onAuthStateChanged(auth, (user) => {
	isSignedIn = Boolean(user);
	editBtn?.classList.toggle('hide', !isSignedIn);

	if (!isSignedIn) {
		closeEditModal();
	}
});

// Initial render from cache/defaults before Firebase finishes loading
renderPageGuidelines();
watchLanguageChanges();
subscribeToGuidelines();
setupModalListeners();

function getCurrentPageLanguage() {
	return document.documentElement.dataset.language === 'bg' ? 'bg' : 'en';
}

function readCachedMarkdown(lang) {
	try {
		const value = localStorage.getItem(STORAGE_KEYS[lang]);
		return value && value.trim() ? value : null;
	} catch {
		return null;
	}
}

function writeCachedMarkdown(lang, content) {
	try {
		localStorage.setItem(STORAGE_KEYS[lang], content);
	} catch {
		// Ignore private browsing storage restrictions
	}
}

function extractMarkdownContent(record) {
	if (typeof record === 'string' && record.trim()) {
		return record;
	}
	if (record && typeof record.content === 'string' && record.content.trim()) {
		return record.content;
	}
	return null;
}

function subscribeToGuidelines() {
	const guidelinesRef = ref(db, 'guidelines');
	onValue(
		guidelinesRef,
		(snapshot) => {
			const val = snapshot.val();
			const enContent = extractMarkdownContent(val?.en);
			const bgContent = extractMarkdownContent(val?.bg);

			guidelinesMarkdown.en = enContent || DEFAULT_MARKDOWN.en;
			guidelinesMarkdown.bg = bgContent || DEFAULT_MARKDOWN.bg;

			writeCachedMarkdown('en', guidelinesMarkdown.en);
			writeCachedMarkdown('bg', guidelinesMarkdown.bg);

			renderPageGuidelines();
		},
		(error) => {
			console.error('Failed to load guidelines from Firebase:', error);
		},
	);
}

function watchLanguageChanges() {
	const observer = new MutationObserver(() => {
		renderPageGuidelines();
	});

	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['data-language', 'lang'],
	});
}

function escapeHtml(str) {
	return String(str ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function sanitizeUrl(url) {
	const trimmed = String(url ?? '').trim();
	if (/^(https?:\/\/|mailto:|\/|#)/i.test(trimmed)) {
		return trimmed.replace(/"/g, '&quot;');
	}
	return '#';
}

function formatInlineMarkdown(text) {
	const codePlaceholders = [];
	let safe = escapeHtml(text);

	// 1. Extract inline code `...` so inner characters aren't formatted
	safe = safe.replace(/`([^`]+)`/g, (_, code) => {
		const token = `\u0000CODE_${codePlaceholders.length}\u0000`;
		codePlaceholders.push(`<code>${code}</code>`);
		return token;
	});

	// 2. Links [text](url)
	safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, rawUrl) => {
		const href = sanitizeUrl(rawUrl);
		const isExternal = /^https?:\/\//i.test(href);
		const targetAttrs = isExternal
			? ' target="_blank" rel="noopener noreferrer"'
			: '';
		return `<a href="${href}"${targetAttrs}>${label}</a>`;
	});

	// 3. Bold **text** or __text__
	safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	safe = safe.replace(/__([^_]+)__/g, '<strong>$1</strong>');

	// 4. Italic *text* or _text_
	safe = safe.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
	safe = safe.replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1<em>$2</em>');

	// 5. Restore inline code tokens
	codePlaceholders.forEach((html, index) => {
		safe = safe.replace(`\u0000CODE_${index}\u0000`, html);
	});

	return safe;
}

function normalizeIconClass(rawIcon, sectionIndex) {
	const fallback =
		DEFAULT_SECTION_ICONS[sectionIndex] || 'fa-circle-info';
	const cleaned = String(rawIcon || '')
		.trim()
		.replace(/[^a-zA-Z0-9-\s]/g, '');

	if (!cleaned) {
		return `fa-solid ${fallback}`;
	}

	if (/\bfa-(solid|regular|brands)\b/.test(cleaned)) {
		return cleaned;
	}

	const iconToken = cleaned.startsWith('fa-') ? cleaned : `fa-${cleaned}`;
	return `fa-solid ${iconToken}`;
}

function parseGuidelinesMarkdown(markdown, lang = 'en') {
	const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
	let heroTitle = lang === 'bg' ? 'Правила' : 'Guidelines';
	let hasCustomHeroTitle = false;
	const heroParagraphLines = [];
	const sections = [];

	let currentSection = null;
	let currentParagraph = [];
	let currentList = null;

	const flushParagraph = () => {
		if (!currentParagraph.length) {
			return;
		}
		const text = currentParagraph.join(' ').trim();
		currentParagraph = [];
		if (!text) {
			return;
		}
		if (currentSection) {
			currentSection.blocks.push({
				type: 'paragraph',
				text,
			});
		} else {
			heroParagraphLines.push(text);
		}
	};

	const flushList = () => {
		if (!currentList || !currentList.items.length) {
			currentList = null;
			return;
		}
		if (currentSection) {
			currentSection.blocks.push(currentList);
		}
		currentList = null;
	};

	lines.forEach((rawLine) => {
		const line = rawLine.trim();

		if (!line) {
			flushParagraph();
			flushList();
			return;
		}

		// H1 (# Title) -> Hero Title
		const h1Match = !currentSection && !hasCustomHeroTitle && line.match(/^#\s+(.+)$/);
		if (h1Match) {
			flushParagraph();
			heroTitle = h1Match[1].trim();
			hasCustomHeroTitle = true;
			return;
		}

		// H2 (## [fa-icon] Section Title or ## Section Title) -> Guideline Section
		const h2Match = line.match(/^##\s+(?:\[([^\]]+)\]\s*)?(.+)$/);
		if (h2Match) {
			flushParagraph();
			flushList();
			const rawIcon = h2Match[1] || '';
			const headingText = h2Match[2].trim();
			currentSection = {
				iconClass: normalizeIconClass(rawIcon, sections.length),
				title: headingText,
				blocks: [],
			};
			sections.push(currentSection);
			return;
		}

		// Unordered list item (- item or * item)
		const ulMatch = line.match(/^[-*]\s+(.+)$/);
		if (ulMatch && currentSection) {
			flushParagraph();
			if (!currentList || currentList.type !== 'ul') {
				flushList();
				currentList = { type: 'ul', items: [] };
			}
			currentList.items.push(ulMatch[1].trim());
			return;
		}

		// Ordered list item (1. item)
		const olMatch = line.match(/^\d+\.\s+(.+)$/);
		if (olMatch && currentSection) {
			flushParagraph();
			if (!currentList || currentList.type !== 'ol') {
				flushList();
				currentList = { type: 'ol', items: [] };
			}
			currentList.items.push(olMatch[1].trim());
			return;
		}

		// Standard text line (part of a paragraph)
		flushList();
		currentParagraph.push(line);
	});

	flushParagraph();
	flushList();

	return {
		heroTitle,
		heroParagraphs: heroParagraphLines,
		sections,
	};
}

function renderGuidelinesToContainers(markdown, lang, targetHeroEl, targetSheetEl) {
	if (targetHeroEl) targetHeroEl.dataset.i18nIgnore = '';
	if (targetSheetEl) targetSheetEl.dataset.i18nIgnore = '';
	const parsed = parseGuidelinesMarkdown(markdown, lang);

	if (targetHeroEl) {
		targetHeroEl.innerHTML = '';
		const h1 = document.createElement('h1');
		h1.innerHTML = formatInlineMarkdown(parsed.heroTitle);
		targetHeroEl.append(h1);

		parsed.heroParagraphs.forEach((pText) => {
			const p = document.createElement('p');
			p.innerHTML = formatInlineMarkdown(pText);
			targetHeroEl.append(p);
		});
	}

	if (targetSheetEl) {
		targetSheetEl.innerHTML = '';

		parsed.sections.forEach((section) => {
			const hasOnlyParagraphs =
				section.blocks.length > 0 &&
				section.blocks.every((b) => b.type === 'paragraph');

			const article = document.createElement('article');
			article.className = hasOnlyParagraphs
				? 'guideline-section guideline-note'
				: 'guideline-section';

			const headingDiv = document.createElement('div');
			headingDiv.className = 'guideline-section-heading';

			const iconDiv = document.createElement('div');
			iconDiv.className = 'guideline-icon';

			const iconEl = document.createElement('i');
			iconEl.className = section.iconClass;
			iconEl.setAttribute('aria-hidden', 'true');
			iconDiv.append(iconEl);

			const h2 = document.createElement('h2');
			h2.innerHTML = formatInlineMarkdown(section.title);

			headingDiv.append(iconDiv, h2);
			article.append(headingDiv);

			section.blocks.forEach((block) => {
				if (block.type === 'ul' || block.type === 'ol') {
					const listEl = document.createElement(block.type);
					block.items.forEach((itemText) => {
						const li = document.createElement('li');
						li.innerHTML = formatInlineMarkdown(itemText);
						listEl.append(li);
					});
					article.append(listEl);
				} else if (block.type === 'paragraph') {
					const p = document.createElement('p');
					p.innerHTML = formatInlineMarkdown(block.text);
					article.append(p);
				}
			});

			targetSheetEl.append(article);
		});
	}
}

function renderPageGuidelines() {
	const lang = getCurrentPageLanguage();
	const markdown = guidelinesMarkdown[lang] || DEFAULT_MARKDOWN[lang];
	renderGuidelinesToContainers(markdown, lang, heroContentEl, sheetEl);
	delete document.documentElement.dataset.i18nPending;
}

function openEditModal() {
	if (!isSignedIn || !modalOverlay) {
		return;
	}

	draftMarkdown = {
		en: guidelinesMarkdown.en,
		bg: guidelinesMarkdown.bg,
	};

	activeEditorLang = getCurrentPageLanguage();
	setEditorMode('write');
	syncEditorToActiveLanguage();
	hideModalError();

	modalOverlay.classList.remove('hide');
	markdownInput?.focus();
}

function closeEditModal() {
	if (!modalOverlay) {
		return;
	}
	modalOverlay.classList.add('hide');
	hideModalError();
}

function syncEditorToActiveLanguage() {
	fileTabBtns.forEach((btn) => {
		const isSelected = btn.dataset.lang === activeEditorLang;
		btn.classList.toggle('active', isSelected);
		btn.setAttribute('aria-selected', String(isSelected));
	});

	if (markdownInput) {
		markdownInput.value = draftMarkdown[activeEditorLang] || '';
	}

	if (activeEditorMode === 'preview') {
		renderModalPreview();
	}
}

function setEditorMode(mode) {
	activeEditorMode = mode === 'preview' ? 'preview' : 'write';

	const isPreview = activeEditorMode === 'preview';
	tabWriteBtn?.classList.toggle('active', !isPreview);
	tabPreviewBtn?.classList.toggle('active', isPreview);
	editorPane?.classList.toggle('hide', isPreview);
	syntaxHelpEl?.classList.toggle('hide', isPreview);
	previewPane?.classList.toggle('hide', !isPreview);

	if (isPreview) {
		renderModalPreview();
	} else {
		markdownInput?.focus();
	}
}

function renderModalPreview() {
	const currentText = draftMarkdown[activeEditorLang] || '';
	renderGuidelinesToContainers(
		currentText,
		activeEditorLang,
		previewHeroEl,
		previewSheetEl,
	);
}

function showModalError(message) {
	if (!errorEl) return;
	errorEl.textContent = message;
	errorEl.classList.remove('hide');
}

function hideModalError() {
	if (!errorEl) return;
	errorEl.textContent = '';
	errorEl.classList.add('hide');
}

function setupModalListeners() {
	editBtn?.addEventListener('click', openEditModal);
	modalCloseBtn?.addEventListener('click', closeEditModal);
	cancelBtn?.addEventListener('click', closeEditModal);

	modalOverlay?.addEventListener('click', (e) => {
		if (e.target === modalOverlay && !isSaving) {
			closeEditModal();
		}
	});

	document.addEventListener('keydown', (e) => {
		if (
			e.key === 'Escape' &&
			modalOverlay &&
			!modalOverlay.classList.contains('hide') &&
			!isSaving
		) {
			closeEditModal();
		}
	});

	markdownInput?.addEventListener('input', () => {
		draftMarkdown[activeEditorLang] = markdownInput.value;
	});

	fileTabBtns.forEach((btn) => {
		btn.addEventListener('click', () => {
			const nextLang = btn.dataset.lang === 'bg' ? 'bg' : 'en';
			if (nextLang === activeEditorLang) {
				return;
			}
			if (markdownInput) {
				draftMarkdown[activeEditorLang] = markdownInput.value;
			}
			activeEditorLang = nextLang;
			syncEditorToActiveLanguage();
		});
	});

	tabWriteBtn?.addEventListener('click', () => {
		setEditorMode('write');
	});

	tabPreviewBtn?.addEventListener('click', () => {
		if (markdownInput) {
			draftMarkdown[activeEditorLang] = markdownInput.value;
		}
		setEditorMode('preview');
	});

	modalForm?.addEventListener('submit', handleSaveGuidelines);
}

async function handleSaveGuidelines(e) {
	e.preventDefault();
	if (!isSignedIn || isSaving) {
		return;
	}

	if (markdownInput) {
		draftMarkdown[activeEditorLang] = markdownInput.value;
	}

	const enText = (draftMarkdown.en || '').trim();
	const bgText = (draftMarkdown.bg || '').trim();

	if (!enText || !bgText) {
		showModalError('Both guidelines-en.md and guidelines-bg.md must have content.');
		return;
	}

	isSaving = true;
	hideModalError();

	if (saveBtn) {
		saveBtn.disabled = true;
		saveBtn.textContent = 'Saving...';
	}

	try {
		const now = Date.now();
		const updatedBy = auth.currentUser?.email || null;

		// Save as 2 separate files in Firebase Realtime Database: guidelines/en and guidelines/bg
		await Promise.all([
			set(ref(db, 'guidelines/en'), {
				fileName: 'guidelines-en.md',
				language: 'en',
				content: enText,
				updatedAt: now,
				updatedBy,
			}),
			set(ref(db, 'guidelines/bg'), {
				fileName: 'guidelines-bg.md',
				language: 'bg',
				content: bgText,
				updatedAt: now,
				updatedBy,
			}),
		]);

		guidelinesMarkdown.en = enText;
		guidelinesMarkdown.bg = bgText;
		writeCachedMarkdown('en', enText);
		writeCachedMarkdown('bg', bgText);

		renderPageGuidelines();
		closeEditModal();
	} catch (err) {
		console.error('Failed to save guidelines:', err);
		showModalError('Failed to save guidelines: ' + (err.message || 'Unknown error'));
	} finally {
		isSaving = false;
		if (saveBtn) {
			saveBtn.disabled = false;
			saveBtn.textContent = 'Save';
		}
	}
}
