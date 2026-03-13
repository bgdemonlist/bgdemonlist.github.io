import {
	get,
	orderByChild,
	query,
	ref,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import {
	byId,
	db,
	getYouTubeVideoId,
	initAuthNavigation,
	normalizeKey,
	setText,
} from './app-common.js';

const levelName = byId('levelName');
const levelCreator = byId('levelCreator');
const levelVideo = byId('level-video');
const score = byId('score');
const victorCount = byId('victor-count');
const victorsContainer = byId('victors-container');

initAuthNavigation();

function calculatePoints(pos) {
	if (pos <= 20) {
		return 322.2 * 0.945 ** (pos - 1) + 0.8;
	}

	if (pos <= 400) {
		return 106.2 * 0.9882 ** (pos - 20);
	}

	return 1;
}

function renderVictors(records) {
	if (!victorsContainer) {
		return;
	}

	victorsContainer.innerHTML = '';

	const title = document.createElement('div');
	title.id = 'victors-title';

	const titleHeading = document.createElement('h2');
	setText(titleHeading, 'Holder');
	title.append(titleHeading);
	victorsContainer.append(title);

	if (!records.length) {
		const emptyState = document.createElement('a');
		const message = document.createElement('h2');
		setText(message, 'No records yet...');
		emptyState.append(message);
		victorsContainer.append(emptyState);
		return;
	}

	records.forEach((record) => {
		const link = document.createElement('a');
		link.href = record.video || '#';
		if (record.video) {
			link.target = '_blank';
			link.rel = 'noopener noreferrer';
		}

		const holder = document.createElement('h2');
		holder.className = 'victor';
		setText(holder, record.name, 'Unknown');
		link.append(holder);
		victorsContainer.append(link);
	});
}

async function loadLevel() {
	const position = Number(new URL(document.location).searchParams.get('pos'));
	if (!position) {
		setText(levelName, 'Level not found');
		setText(levelCreator, 'Invalid or missing position.');
		renderVictors([]);
		return;
	}

	const levelsSnapshot = await get(ref(db, 'levels'));
	if (!levelsSnapshot.exists()) {
		setText(levelName, 'Level not found');
		setText(levelCreator, 'No levels are available right now.');
		renderVictors([]);
		return;
	}

	let selectedLevel = null;
	levelsSnapshot.forEach((child) => {
		const level = child.val();
		if (level?.pos === position) {
			selectedLevel = level;
		}
	});

	if (!selectedLevel) {
		setText(levelName, 'Level not found');
		setText(levelCreator, `There is no level at #${position}.`);
		renderVictors([]);
		return;
	}

	setText(levelName, selectedLevel.name);
	setText(levelCreator, `By ${selectedLevel.creator ?? 'Unknown creator'}`);
	document.title = `#${position} - ${selectedLevel.name}`;

	const videoId = getYouTubeVideoId(selectedLevel.video);
	if (levelVideo) {
		levelVideo.src = videoId
			? `https://www.youtube.com/embed/${videoId}`
			: '';
		levelVideo.title = selectedLevel.name ?? 'Level video';
	}

	setText(score, calculatePoints(position).toFixed(2));

	const recordsSnapshot = await get(
		query(
			ref(db, `levels/${normalizeKey(selectedLevel.name)}/records`),
			orderByChild('recordNum'),
		),
	);
	const records = [];
	recordsSnapshot.forEach((record) => {
		if (record.val()) {
			records.push(record.val());
		}
	});

	setText(victorCount, `${records.length} victors`);
	renderVictors(records);
}

loadLevel().catch((error) => {
	console.error('Failed to load level details.', error);
	setText(levelName, 'Level not found');
	setText(levelCreator, 'Something went wrong while loading this page.');
	renderVictors([]);
});
