import {
	get,
	orderByChild,
	query,
	ref,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import {
	byId,
	db,
	getYouTubeThumbnail,
	initAuthNavigation,
	openExternal,
	setText,
} from './app-common.js';

const levelSection = byId('levels-container');
const levelSearch = byId('level-search');
const levelsList = [];

initAuthNavigation();

function createLevelCard(level) {
	const levelContainer = document.createElement('div');
	levelContainer.className = 'level-container';

	const levelImage = document.createElement('img');
	levelImage.className = 'level-img';
	levelImage.src = getYouTubeThumbnail(level.video);
	levelImage.alt = `${level.name} thumbnail`;
	levelImage.addEventListener('click', () => openExternal(level.video));
	levelContainer.append(levelImage);

	const textContainer = document.createElement('div');
	textContainer.className = 'level-text-container';

	const levelName = document.createElement('h4');
	levelName.className = 'level-name';
	setText(levelName, `#${level.pos} - ${level.name}`);
	levelName.addEventListener('click', () => {
		location.href = `level.html?pos=${level.pos}`;
	});
	textContainer.append(levelName);

	const levelCreator = document.createElement('p');
	levelCreator.className = 'level-creator';
	setText(levelCreator, level.creator, 'Unknown creator');
	textContainer.append(levelCreator);

	levelContainer.append(textContainer);
	return levelContainer;
}

function applySearchFilter() {
	const searchValue = levelSearch?.value.toLowerCase().trim() ?? '';

	levelsList.forEach((level) => {
		const isVisible = (level.name ?? '').toLowerCase().includes(searchValue);
		level.element.classList.toggle('hide', !isVisible);
	});
}

async function loadLevels() {
	if (!levelSection) {
		return;
	}

	const snapshot = await get(query(ref(db, 'levels'), orderByChild('pos')));

	snapshot.forEach((child) => {
		const level = child.val();
		if (!level?.name || typeof level.pos !== 'number') {
			return;
		}

		level.element = createLevelCard(level);
		levelSection.append(level.element);
		levelsList.push(level);
	});
}

levelSearch?.addEventListener('input', applySearchFilter);

loadLevels().catch((error) => {
	console.error('Failed to load levels.', error);
});
