import {
	ref,
	set,
	update,
	get,
	query,
	orderByChild,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import {
	byId,
	db,
	getYouTubeVideoId,
	initAuthNavigation,
	normalizeKey,
	setText,
} from './app-common.js';

const position = Number(new URL(document.location).searchParams.get('pos'));
const plus = byId('plus');
const blackScreen = byId('black-screen');
const addPopup = byId('add-popup');
const addPopupForm = byId('add-popup-bottom');
const addPopupExit = byId('add-popup-close');
const levelName = byId('levelName');
const levelCreator = byId('levelCreator');
const levelVideo = byId('level-video');
const score = byId('score');
const victorCount = byId('victor-count');
const victorsContainer = byId('victors-container');
let currentLevel = null;

initAuthNavigation();

function calculatePoints(pos) {
	if (pos > 150) {
		return 0;
	}

	if (pos <= 12) {
		return Math.pow(0.9, pos) * 323 + 32.3;
	}

	return Math.pow(1.026, 200 - pos);
}

function setPopupVisibility(isVisible) {
	blackScreen.style.display = isVisible ? 'flex' : 'none';
	addPopup.style.display = isVisible ? 'flex' : 'none';
}

function buildUserKeyLookup(usersSnapshot) {
	const userKeyLookup = new Map();

	usersSnapshot.forEach((userSnapshot) => {
		const userValue = userSnapshot.val() ?? {};
		const userKey = userSnapshot.key;
		const nameKey = normalizeKey(userValue.name || userKey);

		if (nameKey && !userKeyLookup.has(nameKey)) {
			userKeyLookup.set(nameKey, userKey);
		}

		const keyKey = normalizeKey(userKey);
		if (keyKey && !userKeyLookup.has(keyKey)) {
			userKeyLookup.set(keyKey, userKey);
		}
	});

	return userKeyLookup;
}

function extractRecords(recordsSnapshot, userKeyLookup) {
	const records = [];

	recordsSnapshot.forEach((recordSnapshot) => {
		const record = recordSnapshot.val();
		if (!record?.name) {
			return;
		}

		const nameKey = normalizeKey(record.name);
		const userKey = userKeyLookup.get(nameKey) || record.name;

		records.push({
			...record,
			levelRecordKey: recordSnapshot.key,
			userKey,
		});
	});

	return records;
}

async function deleteRecord(record, buttonElement) {
	if (!currentLevel?.name) {
		alert('Level not loaded yet.');
		return;
	}

	if (
		!confirm(
			`Delete record for "${record.name}" from this level and the user's profile?`,
		)
	) {
		return;
	}

	if (buttonElement) {
		buttonElement.disabled = true;
	}

	try {
		const levelKey = normalizeKey(currentLevel.name);
		const [recordsSnapshot, usersSnapshot] = await Promise.all([
			get(query(ref(db, `levels/${levelKey}/records`), orderByChild('recordNum'))),
			get(ref(db, 'users')),
		]);

		const userKeyLookup = buildUserKeyLookup(usersSnapshot);
		const allRecords = extractRecords(recordsSnapshot, userKeyLookup);
		const targetRecord = allRecords.find(
			(candidate) => candidate.levelRecordKey === record.levelRecordKey,
		);

		if (!targetRecord) {
			alert('Record no longer exists. Refreshing...');
			await loadLevel();
			return;
		}

		const remainingRecords = allRecords.filter(
			(candidate) => candidate.levelRecordKey !== targetRecord.levelRecordKey,
		);
		const updates = {};

		updates[`levels/${levelKey}/records/${targetRecord.levelRecordKey}`] = null;
		updates[`users/${targetRecord.userKey}/records/${levelKey}`] = null;

		remainingRecords.forEach((entry, index) => {
			const resolvedUserKey =
				userKeyLookup.get(normalizeKey(entry.name)) || entry.userKey || entry.name;

			updates[`levels/${levelKey}/records/${entry.levelRecordKey}/recordNum`] = index;
			updates[`users/${resolvedUserKey}/records/${levelKey}/first`] = index === 0;
		});

		await update(ref(db), updates);
		await loadLevel();
	} catch (error) {
		console.error('Failed to delete record.', error);
		alert('Could not delete this record. Please try again.');
	} finally {
		if (buttonElement) {
			buttonElement.disabled = false;
		}
	}
}

function renderVictors(records) {
	if (!victorsContainer) {
		return;
	}

	victorsContainer.innerHTML = '';

	const title = document.createElement('li');
	title.id = 'victors-title';
	const titleHeading = document.createElement('h2');
	setText(titleHeading, 'Holder');
	title.append(titleHeading);
	victorsContainer.append(title);

	if (!records.length) {
		const emptyState = document.createElement('li');
		emptyState.className = 'victor-item';
		const heading = document.createElement('h2');
		heading.className = 'victor';
		setText(heading, 'No records yet...');
		emptyState.append(heading);
		victorsContainer.append(emptyState);
		return;
	}

	records.forEach((record, index) => {
		const row = document.createElement('li');
		row.className = `victor-row${index === 0 ? ' first-record' : ''}`;

		const link = document.createElement('a');
		link.className = 'victor-link';
		link.href = record.video || '#';
		if (record.video) {
			link.target = '_blank';
			link.rel = 'noopener noreferrer';
		}

		const holder = document.createElement('h2');
		holder.className = 'victor';
		setText(holder, record.name, 'Unknown');
		link.append(holder);

		const deleteButton = document.createElement('button');
		deleteButton.type = 'button';
		deleteButton.className = 'victor-delete-btn';
		setText(deleteButton, 'Delete');
		deleteButton.addEventListener('click', () => {
			deleteRecord(record, deleteButton);
		});

		row.append(link, deleteButton);
		victorsContainer.append(row);
	});
}

async function loadLevel() {
	if (!position) {
		currentLevel = null;
		setText(levelName, 'Level not found');
		setText(levelCreator, 'Invalid or missing position.');
		renderVictors([]);
		return;
	}

	const levelsSnapshot = await get(ref(db, 'levels'));
	let selectedLevel = null;

	levelsSnapshot.forEach((child) => {
		const level = child.val();
		if (level?.pos === position) {
			selectedLevel = level;
		}
	});

	if (!selectedLevel) {
		currentLevel = null;
		setText(levelName, 'Level not found');
		setText(levelCreator, `There is no level at #${position}.`);
		renderVictors([]);
		return;
	}

	currentLevel = selectedLevel;
	setText(levelName, selectedLevel.name);
	setText(levelCreator, `By ${selectedLevel.creator ?? 'Unknown creator'}`);
	document.title = `#${position} - ${selectedLevel.name}`;

	const videoId = getYouTubeVideoId(selectedLevel.video);
	levelVideo.src = videoId ? `https://www.youtube.com/embed/${videoId}` : '';
	setText(score, calculatePoints(position).toFixed(2));

	const [recordsSnapshot, usersSnapshot] = await Promise.all([
		get(
			query(
				ref(db, `levels/${normalizeKey(selectedLevel.name)}/records`),
				orderByChild('recordNum'),
			),
		),
		get(ref(db, 'users')),
	]);
	const userKeyLookup = buildUserKeyLookup(usersSnapshot);
	const records = extractRecords(recordsSnapshot, userKeyLookup);

	setText(victorCount, `${records.length} victors`);
	renderVictors(records);
}

plus?.addEventListener('click', () => {
	setPopupVisibility(true);
});

addPopupExit?.addEventListener('click', () => {
	setPopupVisibility(false);
});

addPopupForm?.addEventListener('submit', async (event) => {
	event.preventDefault();

	const name = byId('add-popup-name').value.trim();
	const video = byId('add-popup-video').value.trim();
	const level = levelName.textContent.trim();

	if (!name || !video || !level) {
		alert('Please provide both a player name and a video link.');
		return;
	}

	const recordsSnapshot = await get(ref(db, `levels/${normalizeKey(level)}/records`));
	const recordNum = recordsSnapshot.exists()
		? Object.keys(recordsSnapshot.val()).length
		: 0;

	const userRef = ref(db, `users/${name}`);
	const userSnapshot = await get(userRef);

	if (!userSnapshot.exists()) {
		await set(userRef, { name });
	}

	await Promise.all([
		set(ref(db, `users/${name}/records/${normalizeKey(level)}`), {
			first: recordNum === 0,
			name: level,
			video,
		}),
		set(ref(db, `levels/${normalizeKey(level)}/records/${normalizeKey(name)}`), {
			name,
			video,
			recordNum,
		}),
	]);

	addPopupForm.reset();
	setPopupVisibility(false);
	loadLevel().catch((error) => {
		console.error('Failed to refresh level records.', error);
	});
});

loadLevel().catch((error) => {
	console.error('Failed to load admin level page.', error);
	setText(levelName, 'Level not found');
	setText(levelCreator, 'Something went wrong while loading this page.');
	renderVictors([]);
});
