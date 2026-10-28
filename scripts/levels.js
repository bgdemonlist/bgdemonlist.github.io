import {
	equalTo,
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
	calculatePoints,
	db,
	getYouTubeVideoId,
	initAuthNavigation,
	normalizeKey,
	setText,
	setYouTubeThumbnail,
} from './app-common.js';

const levelName = byId('levelName');
const levelCreator = byId('levelCreator');
const levelVideo = byId('level-video');
const score = byId('score');
const victorCount = byId('victor-count');
const victorsContainer = byId('victors-container');
const prevLevelBtn = byId('prev-level-btn');
const nextLevelBtn = byId('next-level-btn');

const editLevelBtn = byId('edit-level-btn');
const addRemoveDiv = byId('add-remove-div');
const plus = byId('plus');

const blackScreen = byId('black-screen');
const addPopup = byId('add-popup');
const addPopupForm = byId('add-popup-bottom');
const addPopupExit = byId('add-popup-close');
const addPopupFirstCheckbox = byId('add-popup-first');

const editPopup = byId('edit-popup');
const editPopupForm = byId('edit-popup-bottom');
const editPopupExit = byId('edit-popup-close');
const editPopupName = byId('edit-popup-name');
const editPopupCreator = byId('edit-popup-creator');
const editPopupVideo = byId('edit-popup-video');
const editPopupFirstVictor = byId('edit-popup-first-victor');

let currentLevel = null;
let currentLevelKey = null;
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

function trimName(value) {
	return String(value ?? '').trim();
}

function buildUserKeyLookup(usersSnapshot) {
	const userKeyLookup = new Map();

	usersSnapshot.forEach((userSnapshot) => {
		const userValue = userSnapshot.val() ?? {};
		const userKey = userSnapshot.key;
		const exactName = trimName(userValue.name || userKey);

		if (exactName && !userKeyLookup.has(exactName)) {
			userKeyLookup.set(exactName, userKey);
		}

		const exactKey = trimName(userKey);
		if (exactKey && !userKeyLookup.has(exactKey)) {
			userKeyLookup.set(exactKey, userKey);
		}
	});

	return userKeyLookup;
}

function findMatchingUserSnapshots(usersSnapshot, playerName) {
	const exactTarget = trimName(playerName);
	if (!exactTarget) {
		return [];
	}

	const matches = [];

	usersSnapshot.forEach((userSnapshot) => {
		const userValue = userSnapshot.val() ?? {};
		const uKey = trimName(userSnapshot.key);
		const uName = trimName(userValue.name);
		if (uKey === exactTarget || (uName && uName === exactTarget)) {
			matches.push(userSnapshot);
		}
	});

	return matches;
}

function extractRecords(recordsSnapshot, userKeyLookup) {
	const records = [];
	if (!recordsSnapshot) {
		return records;
	}

	recordsSnapshot.forEach((recordSnapshot) => {
		const record = recordSnapshot.val();
		if (!record?.name) {
			return;
		}

		const exactName = trimName(record.name);
		const userKey = userKeyLookup ? (userKeyLookup.get(exactName) || exactName) : exactName;

		records.push({
			...record,
			levelRecordKey: recordSnapshot.key,
			userKey,
		});
	});

	return records;
}

function sortRecordsByOrder(records) {
	return [...records].sort((a, b) => (a.recordNum ?? -1) - (b.recordNum ?? -1));
}

function applyOrderedRecordsUpdates(
	updates,
	levelKey,
	levelDisplayName,
	orderedRecords,
	usersSnapshot,
) {
	const normalizedLevelKey = normalizeKey(levelKey);
	const normalizedLevelName = normalizeKey(levelDisplayName);

	orderedRecords.forEach((entry, index) => {
		const isFirst = index === 0;
		updates[`levels/${levelKey}/records/${entry.levelRecordKey}/recordNum`] = index;

		const matchingUsers = findMatchingUserSnapshots(
			usersSnapshot,
			entry.name,
		);

		matchingUsers.forEach((userSnap) => {
			const userVal = userSnap.val() ?? {};
			const userRecords = userVal.records ?? {};
			let foundRecKey = null;

			Object.entries(userRecords).forEach(([recKey, recVal]) => {
				const recKeyNorm = normalizeKey(recKey);
				const recNameNorm = normalizeKey(recVal?.name);
				if (
					recKey === levelKey ||
					recKeyNorm === normalizedLevelKey ||
					recKeyNorm === normalizedLevelName ||
					(recNameNorm && recNameNorm === normalizedLevelName)
				) {
					foundRecKey = recKey;
					updates[`users/${userSnap.key}/records/${recKey}/first`] = isFirst;
				}
			});

			if (!foundRecKey) {
				updates[`users/${userSnap.key}/records/${normalizedLevelKey}`] = {
					first: isFirst,
					name: levelDisplayName,
					video: entry.video || '',
				};
			}
		});
	});
}

async function setFirstVictor(record, buttonElement) {
	if (!currentLevel?.name || !record?.levelRecordKey) {
		return;
	}

	if (buttonElement) {
		buttonElement.disabled = true;
	}

	try {
		const levelKey = currentLevelKey || normalizeKey(currentLevel.name);
		const [recordsSnapshot, usersSnapshot] = await Promise.all([
			get(ref(db, `levels/${levelKey}/records`)),
			get(ref(db, 'users')),
		]);

		const userKeyLookup = buildUserKeyLookup(usersSnapshot);
		const allRecords = sortRecordsByOrder(
			extractRecords(recordsSnapshot, userKeyLookup),
		);
		const targetRecord = allRecords.find(
			(candidate) =>
				candidate.levelRecordKey === record.levelRecordKey ||
				trimName(candidate.name) === trimName(record.name),
		);

		if (!targetRecord) {
			alert('Record not found. Refreshing...');
			await loadLevel();
			return;
		}

		const otherRecords = allRecords.filter(
			(candidate) => candidate.levelRecordKey !== targetRecord.levelRecordKey,
		);
		const reorderedRecords = [targetRecord, ...otherRecords];
		const updates = {};

		applyOrderedRecordsUpdates(
			updates,
			levelKey,
			currentLevel.name,
			reorderedRecords,
			usersSnapshot,
		);

		await update(ref(db), updates);
		await loadLevel();
	} catch (error) {
		console.error('Failed to update first victor.', error);
		alert('Could not update first victor. Please try again.');
	} finally {
		if (buttonElement) {
			buttonElement.disabled = false;
		}
	}
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
		const levelKey = currentLevelKey || normalizeKey(currentLevel.name);
		const normalizedLevelKey = normalizeKey(levelKey);
		const normalizedLevelName = normalizeKey(currentLevel.name);

		const [recordsSnapshot, usersSnapshot] = await Promise.all([
			get(ref(db, `levels/${levelKey}/records`)),
			get(ref(db, 'users')),
		]);

		const userKeyLookup = buildUserKeyLookup(usersSnapshot);
		const allRecords = sortRecordsByOrder(
			extractRecords(recordsSnapshot, userKeyLookup),
		);
		const targetRecord =
			allRecords.find(
				(candidate) =>
					candidate.levelRecordKey === record.levelRecordKey ||
					trimName(candidate.name) === trimName(record.name),
			) || record;

		const remainingRecords = allRecords.filter(
			(candidate) =>
				candidate.levelRecordKey !== targetRecord.levelRecordKey &&
				trimName(candidate.name) !== trimName(targetRecord.name),
		);
		const updates = {};

		// Delete from levels/
		if (targetRecord.levelRecordKey) {
			updates[`levels/${levelKey}/records/${targetRecord.levelRecordKey}`] = null;
		}
		allRecords.forEach((candidate) => {
			if (trimName(candidate.name) === trimName(targetRecord.name)) {
				updates[`levels/${levelKey}/records/${candidate.levelRecordKey}`] = null;
			}
		});

		// Delete from users/ across any exact-case matching user keys and any matching level record keys
		const matchingUsers = findMatchingUserSnapshots(
			usersSnapshot,
			targetRecord.name,
		);

		matchingUsers.forEach((userSnap) => {
			const userVal = userSnap.val() ?? {};
			const userRecords = userVal.records ?? {};

			updates[`users/${userSnap.key}/records/${levelKey}`] = null;
			updates[`users/${userSnap.key}/records/${normalizedLevelKey}`] = null;

			Object.entries(userRecords).forEach(([recKey, recVal]) => {
				const recKeyNorm = normalizeKey(recKey);
				const recNameNorm = normalizeKey(recVal?.name);
				if (
					recKey === levelKey ||
					recKeyNorm === normalizedLevelKey ||
					recKeyNorm === normalizedLevelName ||
					(recNameNorm && recNameNorm === normalizedLevelName)
				) {
					updates[`users/${userSnap.key}/records/${recKey}`] = null;
				}
			});
		});

		// Also fallback in case the user key wasn't in usersSnapshot for some reason
		if (targetRecord.userKey) {
			updates[`users/${targetRecord.userKey}/records/${levelKey}`] = null;
			updates[`users/${targetRecord.userKey}/records/${normalizedLevelKey}`] = null;
		}
		if (targetRecord.name) {
			updates[`users/${targetRecord.name}/records/${levelKey}`] = null;
			updates[`users/${targetRecord.name}/records/${normalizedLevelKey}`] = null;
		}

		// Re-index remaining records and update first victor flags
		applyOrderedRecordsUpdates(
			updates,
			levelKey,
			currentLevel.name,
			remainingRecords,
			usersSnapshot,
		);

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

function getVideoPlatformLabel(url) {
	if (!url) {
		return 'Video';
	}
	const lower = String(url).toLowerCase();
	if (lower.includes('medal.tv')) {
		return 'Medal';
	}
	if (lower.includes('tiktok.com')) {
		return 'TikTok';
	}
	if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
		return 'YouTube';
	}
	if (lower.includes('twitch.tv')) {
		return 'Twitch';
	}
	if (lower.includes('streamable.com')) {
		return 'Streamable';
	}
	return 'Video';
}

function renderVictors(records) {
	if (!victorsContainer) {
		return;
	}

	victorsContainer.innerHTML = '';

	const title = document.createElement('li');
	title.id = 'victors-title';

	const colHolder = document.createElement('span');
	colHolder.className = 'victor-col-holder';
	setText(colHolder, 'Record Holder');

	const colProof = document.createElement('span');
	colProof.className = 'victor-col-proof';
	setText(colProof, 'Video Proof');

	title.append(colHolder, colProof);
	victorsContainer.append(title);

	if (!records.length) {
		const emptyState = document.createElement('li');
		emptyState.className = 'victor-item empty-victor-row';
		const message = document.createElement('h2');
		message.className = 'victor';
		setText(message, 'No records yet...');
		emptyState.append(message);
		victorsContainer.append(emptyState);
		return;
	}

	records.forEach((record, index) => {
		const isFirst = index === 0;
		const row = document.createElement('li');
		row.className = `victor-row${isFirst ? ' first-record' : ''}`;

		const holderCol = document.createElement('div');
		holderCol.className = 'victor-col-holder';

		const playerLink = document.createElement('a');
		playerLink.className = 'victor-player-link';
		playerLink.href = record.name
			? `leaderboard.html?player=${encodeURIComponent(record.name)}`
			: 'leaderboard.html';

		const holder = document.createElement('h2');
		holder.className = 'victor';
		holder.dataset.i18nIgnore = '';
		setText(holder, record.name, 'Unknown');
		playerLink.append(holder);
		holderCol.append(playerLink);

		const proofCol = document.createElement('div');
		proofCol.className = 'victor-col-proof';

		const link = document.createElement('a');
		link.className = 'victor-link';
		link.href = record.video || '#';
		if (record.video) {
			link.target = '_blank';
			link.rel = 'noopener noreferrer';
		}

		const ytLabel = document.createElement('span');
		ytLabel.dataset.i18nIgnore = '';
		setText(ytLabel, getVideoPlatformLabel(record.video));
		const extIcon = document.createElement('i');
		extIcon.className = 'fa-solid fa-arrow-up-right-from-square';
		extIcon.setAttribute('aria-hidden', 'true');
		link.append(ytLabel, extIcon);
		proofCol.append(link);

		if (isAdminLoggedIn) {
			if (!isFirst) {
				const firstButton = document.createElement('button');
				firstButton.type = 'button';
				firstButton.className = 'victor-first-btn';
				firstButton.title = 'Set as First Victor';
				firstButton.setAttribute('aria-label', 'Set as First Victor');
				firstButton.innerHTML = '<i class="fa-solid fa-crown" aria-hidden="true"></i>';
				firstButton.addEventListener('click', () => {
					setFirstVictor(record, firstButton);
				});
				proofCol.append(firstButton);
			} else {
				const firstBadge = document.createElement('span');
				firstBadge.className = 'victor-first-badge';
				firstBadge.title = 'First Victor';
				firstBadge.innerHTML = '<i class="fa-solid fa-crown" aria-hidden="true"></i>';
				proofCol.append(firstBadge);
			}

			const deleteButton = document.createElement('button');
			deleteButton.type = 'button';
			deleteButton.className = 'victor-delete-btn';
			setText(deleteButton, 'Delete');
			deleteButton.addEventListener('click', () => {
				deleteRecord(record, deleteButton);
			});
			proofCol.append(deleteButton);
		}

		row.append(holderCol, proofCol);
		victorsContainer.append(row);
	});
}

// Shows a thumbnail with a play button and only loads the (heavy) YouTube player on click.
function renderVideoFacade(container, videoId, title) {
	if (!container || container.dataset.videoId === (videoId ?? '')) {
		return;
	}

	container.dataset.videoId = videoId ?? '';
	container.replaceChildren();
	if (!videoId) {
		return;
	}

	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'video-facade-btn';
	button.setAttribute('aria-label', `Play video: ${title}`);

	const thumbnail = document.createElement('img');
	thumbnail.alt = '';
	thumbnail.decoding = 'async';
	setYouTubeThumbnail(thumbnail, `https://youtu.be/${videoId}`);

	const playIcon = document.createElement('span');
	playIcon.className = 'video-facade-play';
	playIcon.setAttribute('aria-hidden', 'true');
	playIcon.innerHTML = '<i class="fa-solid fa-play"></i>';

	button.append(thumbnail, playIcon);
	button.addEventListener(
		'click',
		() => {
			const iframe = document.createElement('iframe');
			iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
			iframe.title = title;
			iframe.allow =
				'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
			iframe.allowFullscreen = true;
			container.replaceChildren(iframe);
		},
		{ once: true },
	);

	container.append(button);
}

function updateLevelNavArrows(position) {
	if (prevLevelBtn) {
		if (position > 1) {
			prevLevelBtn.href = `level.html?pos=${position - 1}`;
			prevLevelBtn.classList.remove('hide');
		} else {
			prevLevelBtn.classList.add('hide');
		}
	}

	if (nextLevelBtn) {
		let maxPos = Infinity;
		try {
			const cached = JSON.parse(localStorage.getItem('bdl-levels-cache-v1'));
			if (Array.isArray(cached) && cached.length > 0) {
				maxPos = cached.length;
			}
		} catch {
			// Ignore storage errors
		}

		if (position >= 1 && position < maxPos) {
			nextLevelBtn.href = `level.html?pos=${position + 1}`;
			nextLevelBtn.classList.remove('hide');
		} else {
			nextLevelBtn.classList.add('hide');
		}
	}
}

async function loadLevel() {
	const position = Number(new URL(document.location).searchParams.get('pos'));
	if (!position) {
		currentLevel = null;
		currentLevelKey = null;
		currentRecords = [];
		setText(levelName, 'Level not found');
		setText(levelCreator, 'Invalid or missing position.');
		prevLevelBtn?.classList.add('hide');
		nextLevelBtn?.classList.add('hide');
		renderVictors([]);
		return;
	}

	// Only download the requested level (its records are nested inside it).
	// Requires `".indexOn": ["pos"]` on `levels` in the database rules to be filtered server-side.
	const levelSnapshot = await get(
		query(ref(db, 'levels'), orderByChild('pos'), equalTo(position)),
	);

	let selectedLevel = null;
	let selectedKey = null;
	let recordsSnapshot = null;
	levelSnapshot.forEach((child) => {
		const level = child.val();
		if (level?.pos === position) {
			selectedLevel = level;
			selectedKey = child.key;
			recordsSnapshot = child.child('records');
			return true;
		}
		return false;
	});

	if (!selectedLevel) {
		currentLevel = null;
		currentLevelKey = null;
		currentRecords = [];
		setText(levelName, 'Level not found');
		setText(levelCreator, `There is no level at #${position}.`);
		prevLevelBtn?.classList.add('hide');
		nextLevelBtn?.classList.add('hide');
		renderVictors([]);
		return;
	}

	currentLevel = selectedLevel;
	currentLevelKey = selectedKey || normalizeKey(selectedLevel.name);
	updateLevelNavArrows(position);
	setText(levelName, selectedLevel.name);
	setText(levelCreator, `published by ${selectedLevel.creator ?? 'Unknown creator'}`);
	document.title = `#${position} - ${selectedLevel.name}`;

	renderVideoFacade(
		levelVideo,
		getYouTubeVideoId(selectedLevel.video),
		selectedLevel.name ?? 'Level video',
	);

	setText(score, calculatePoints(position).toFixed(2));

	// Records are nested in key order, so sort them by recordNum (records without one go first,
	// matching the previous orderByChild('recordNum') behaviour).
	currentRecords = sortRecordsByOrder(extractRecords(recordsSnapshot, null));

	setText(victorCount, `${currentRecords.length} victors`);
	renderVictors(currentRecords);
}

function populateFirstVictorSelect() {
	if (!editPopupFirstVictor) {
		return;
	}

	editPopupFirstVictor.innerHTML = '';

	if (!currentRecords.length) {
		const emptyOpt = document.createElement('option');
		emptyOpt.value = '';
		setText(emptyOpt, 'No records yet...');
		editPopupFirstVictor.append(emptyOpt);
		editPopupFirstVictor.disabled = true;
		return;
	}

	editPopupFirstVictor.disabled = false;
	currentRecords.forEach((record, index) => {
		const opt = document.createElement('option');
		opt.value = record.levelRecordKey;
		opt.dataset.i18nIgnore = '';
		setText(opt, record.name);
		if (index === 0) {
			opt.selected = true;
		}
		editPopupFirstVictor.append(opt);
	});
}

// Event Listeners for Admin Modals
plus?.addEventListener('click', () => {
	if (addPopupFirstCheckbox) {
		addPopupFirstCheckbox.checked = currentRecords.length === 0;
	}
	setPopupVisibility(true);
});

addPopupExit?.addEventListener('click', () => {
	setPopupVisibility(false);
});

addPopupForm?.addEventListener('submit', async (event) => {
	event.preventDefault();

	const rawName = byId('add-popup-name').value.trim();
	const video = byId('add-popup-video').value.trim();
	const level = currentLevel?.name || levelName.textContent.trim();
	const levelKey = currentLevelKey || normalizeKey(level);
	const makeFirstVictor = Boolean(addPopupFirstCheckbox?.checked);

	if (!rawName || !video || !level) {
		alert('Please provide both a player name and a video link.');
		return;
	}

	const [recordsSnapshot, usersSnapshot] = await Promise.all([
		get(ref(db, `levels/${levelKey}/records`)),
		get(ref(db, 'users')),
	]);

	const userKeyLookup = buildUserKeyLookup(usersSnapshot);
	const resolvedUserKey = userKeyLookup.get(rawName) || rawName;
	const existingUserVal = usersSnapshot.child(resolvedUserKey).val();
	const canonicalName = trimName(existingUserVal?.name || rawName);

	const existingRecords = sortRecordsByOrder(
		extractRecords(recordsSnapshot, userKeyLookup),
	);
	const existingSamePlayerRec = existingRecords.find(
		(r) => trimName(r.name) === canonicalName,
	);
	const newRecordKey = existingSamePlayerRec?.levelRecordKey || canonicalName;

	const updates = {};

	if (!usersSnapshot.child(resolvedUserKey).exists()) {
		updates[`users/${resolvedUserKey}/name`] = canonicalName;
	}

	if (makeFirstVictor || existingRecords.length === 0) {
		const remaining = existingRecords.filter(
			(r) =>
				r.levelRecordKey !== newRecordKey &&
				trimName(r.name) !== canonicalName,
		);
		const newEntry = {
			name: canonicalName,
			video,
			recordNum: 0,
			levelRecordKey: newRecordKey,
			userKey: resolvedUserKey,
		};
		updates[`levels/${levelKey}/records/${newRecordKey}`] = {
			name: canonicalName,
			video,
			recordNum: 0,
		};
		updates[`users/${resolvedUserKey}/records/${normalizeKey(level)}`] = {
			first: true,
			name: level,
			video,
		};
		applyOrderedRecordsUpdates(
			updates,
			levelKey,
			level,
			[newEntry, ...remaining],
			usersSnapshot,
		);
	} else {
		const recordNum = existingSamePlayerRec
			? (existingSamePlayerRec.recordNum ?? existingRecords.length - 1)
			: existingRecords.length;
		updates[`levels/${levelKey}/records/${newRecordKey}`] = {
			name: canonicalName,
			video,
			recordNum,
		};
		updates[`users/${resolvedUserKey}/records/${normalizeKey(level)}`] = {
			first: false,
			name: level,
			video,
		};
	}

	await update(ref(db), updates);

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
	populateFirstVictorSelect();
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
	const selectedFirstKey = editPopupFirstVictor?.value || '';

	if (!newName || !newCreator || !newVideo) {
		alert('Please fill out all fields.');
		return;
	}

	if (!currentLevel) {
		alert('Level not loaded yet.');
		return;
	}

	const oldKey = currentLevelKey || normalizeKey(currentLevel.name);
	const newKey = normalizeKey(newName);
	const submitBtn = editPopupForm.querySelector('button');
	submitBtn.disabled = true;

	try {
		const [oldLevelSnapshot, usersSnapshot] = await Promise.all([
			get(ref(db, `levels/${oldKey}`)),
			get(ref(db, 'users')),
		]);

		const oldLevelData = oldLevelSnapshot.val() ?? {};
		const recordsSnapshot = oldLevelSnapshot.child('records');
		const userKeyLookup = buildUserKeyLookup(usersSnapshot);
		let orderedRecords = sortRecordsByOrder(
			extractRecords(recordsSnapshot, userKeyLookup),
		);

		if (selectedFirstKey && orderedRecords.length > 0) {
			const chosenRecord = orderedRecords.find(
				(r) => r.levelRecordKey === selectedFirstKey,
			);
			if (chosenRecord) {
				orderedRecords = [
					chosenRecord,
					...orderedRecords.filter((r) => r.levelRecordKey !== selectedFirstKey),
				];
			}
		}

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

			const updates = {};
			const newRecordsObj = {};

			orderedRecords.forEach((entry, index) => {
				newRecordsObj[entry.levelRecordKey] = {
					name: entry.name,
					video: entry.video,
					recordNum: index,
				};
			});

			updates[`levels/${newKey}`] = {
				...oldLevelData,
				name: newName,
				creator: newCreator,
				video: newVideo,
				records: newRecordsObj,
			};

			updates[`levels/${oldKey}`] = null;

			const firstVictorExactName = orderedRecords[0]
				? trimName(orderedRecords[0].name)
				: null;

			usersSnapshot.forEach((userSnapshot) => {
				const userData = userSnapshot.val();
				if (userData?.records && userData.records[oldKey]) {
					const recordData = userData.records[oldKey];
					const userExact = trimName(userData.name || userSnapshot.key);
					updates[`users/${userSnapshot.key}/records/${newKey}`] = {
						...recordData,
						name: newName,
						first: firstVictorExactName ? userExact === firstVictorExactName : Boolean(recordData.first),
					};
					updates[`users/${userSnapshot.key}/records/${oldKey}`] = null;
				}
			});

			await update(ref(db), updates);
		} else {
			const updates = {
				[`levels/${oldKey}/creator`]: newCreator,
				[`levels/${oldKey}/video`]: newVideo,
			};

			if (orderedRecords.length > 0) {
				applyOrderedRecordsUpdates(
					updates,
					oldKey,
					newName,
					orderedRecords,
					usersSnapshot,
				);
			}

			await update(ref(db), updates);
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
	currentLevelKey = null;
	currentRecords = [];
	setText(levelName, 'Level not found');
	setText(levelCreator, 'Something went wrong while loading this page.');
	renderVictors([]);
});
