import {
	get,
	orderByChild,
	query,
	ref,
	set,
	update,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import {
	auth,
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

const editLevelBtn = byId('edit-level-btn');
const addRemoveDiv = byId('add-remove-div');
const plus = byId('plus');

const blackScreen = byId('black-screen');
const addPopup = byId('add-popup');
const addPopupForm = byId('add-popup-bottom');
const addPopupExit = byId('add-popup-close');

const editPopup = byId('edit-popup');
const editPopupForm = byId('edit-popup-bottom');
const editPopupExit = byId('edit-popup-close');
const editPopupName = byId('edit-popup-name');
const editPopupCreator = byId('edit-popup-creator');
const editPopupVideo = byId('edit-popup-video');

let currentLevel = null;
let currentRecords = [];
let isAdminLoggedIn = false;

initAuthNavigation();

onAuthStateChanged(auth, (user) => {
	isAdminLoggedIn = Boolean(user);
	if (editLevelBtn) {
		editLevelBtn.style.display = isAdminLoggedIn ? 'inline-block' : 'none';
	}
	if (addRemoveDiv) {
		addRemoveDiv.style.display = isAdminLoggedIn ? 'flex' : 'none';
	}
	if (currentRecords.length > 0) {
		renderVictors(currentRecords);
	}
});

function calculatePoints(pos) {
	if (pos <= 20) {
		return 322.2 * 0.945 ** (pos - 1) + 0.8;
	}

	if (pos <= 400) {
		return 106.2 * 0.9882 ** (pos - 20);
	}

	return 1;
}

function setPopupVisibility(isVisible) {
	if (!blackScreen || !addPopup || !editPopup) {
		return;
	}
	blackScreen.style.display = isVisible ? 'flex' : 'none';
	addPopup.style.display = isVisible ? 'flex' : 'none';
	editPopup.style.display = 'none';
}

function setEditPopupVisibility(isVisible) {
	if (!blackScreen || !addPopup || !editPopup) {
		return;
	}
	blackScreen.style.display = isVisible ? 'flex' : 'none';
	editPopup.style.display = isVisible ? 'flex' : 'none';
	addPopup.style.display = 'none';
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
		const userKey = userKeyLookup ? (userKeyLookup.get(nameKey) || record.name) : record.name;

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
		const message = document.createElement('h2');
		message.className = 'victor';
		setText(message, 'No records yet...');
		emptyState.append(message);
		victorsContainer.append(emptyState);
		return;
	}

	records.forEach((record, index) => {
		if (isAdminLoggedIn) {
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
		} else {
			const item = document.createElement('li');
			item.className = `victor-item${index === 0 ? ' first-record' : ''}`;

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
			item.append(link);
			victorsContainer.append(item);
		}
	});
}

async function loadLevel() {
	const position = Number(new URL(document.location).searchParams.get('pos'));
	if (!position) {
		currentLevel = null;
		currentRecords = [];
		setText(levelName, 'Level not found');
		setText(levelCreator, 'Invalid or missing position.');
		renderVictors([]);
		return;
	}

	const levelsSnapshot = await get(ref(db, 'levels'));
	if (!levelsSnapshot.exists()) {
		currentLevel = null;
		currentRecords = [];
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
		currentLevel = null;
		currentRecords = [];
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
	if (levelVideo) {
		levelVideo.src = videoId
			? `https://www.youtube.com/embed/${videoId}`
			: '';
		levelVideo.title = selectedLevel.name ?? 'Level video';
	}

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
	currentRecords = extractRecords(recordsSnapshot, userKeyLookup);

	setText(victorCount, `${currentRecords.length} victors`);
	renderVictors(currentRecords);
}

// Event Listeners for Admin Modals
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

editLevelBtn?.addEventListener('click', () => {
	if (!currentLevel) {
		return;
	}

	editPopupName.value = currentLevel.name || '';
	editPopupCreator.value = currentLevel.creator || '';
	editPopupVideo.value = currentLevel.video || '';
	setEditPopupVisibility(true);
});

editPopupExit?.addEventListener('click', () => {
	setEditPopupVisibility(false);
});

editPopupForm?.addEventListener('submit', async (event) => {
	event.preventDefault();

	const newName = editPopupName.value.trim();
	const newCreator = editPopupCreator.value.trim();
	const newVideo = editPopupVideo.value.trim();

	if (!newName || !newCreator || !newVideo) {
		alert('Please fill out all fields.');
		return;
	}

	if (!currentLevel) {
		alert('Level not loaded yet.');
		return;
	}

	const oldKey = normalizeKey(currentLevel.name);
	const newKey = normalizeKey(newName);
	const submitBtn = editPopupForm.querySelector('button');
	submitBtn.disabled = true;

	try {
		if (oldKey !== newKey) {
			const existingSnapshot = await get(ref(db, `levels/${newKey}`));
			if (existingSnapshot.exists()) {
				alert('A level with that name already exists.');
				submitBtn.disabled = false;
				return;
			}

			if (
				!confirm(
					'Changing the level name will also update all player records that reference this level. Proceed?',
				)
			) {
				submitBtn.disabled = false;
				return;
			}

			const oldLevelSnapshot = await get(ref(db, `levels/${oldKey}`));
			const oldLevelData = oldLevelSnapshot.val();
			const usersSnapshot = await get(ref(db, 'users'));

			const updates = {};

			updates[`levels/${newKey}`] = {
				...oldLevelData,
				name: newName,
				creator: newCreator,
				video: newVideo,
			};

			updates[`levels/${oldKey}`] = null;

			usersSnapshot.forEach((userSnapshot) => {
				const userData = userSnapshot.val();
				if (userData?.records && userData.records[oldKey]) {
					const recordData = userData.records[oldKey];
					updates[`users/${userSnapshot.key}/records/${newKey}`] = {
						...recordData,
						name: newName,
					};
					updates[`users/${userSnapshot.key}/records/${oldKey}`] = null;
				}
			});

			await update(ref(db), updates);
		} else {
			await update(ref(db), {
				[`levels/${oldKey}/creator`]: newCreator,
				[`levels/${oldKey}/video`]: newVideo,
			});
		}

		setEditPopupVisibility(false);
		await loadLevel();
	} catch (error) {
		console.error('Failed to edit level.', error);
		alert('Could not save changes. Please try again.');
	} finally {
		submitBtn.disabled = false;
	}
});

loadLevel().catch((error) => {
	console.error('Failed to load level details.', error);
	currentLevel = null;
	currentRecords = [];
	setText(levelName, 'Level not found');
	setText(levelCreator, 'Something went wrong while loading this page.');
	renderVictors([]);
});
