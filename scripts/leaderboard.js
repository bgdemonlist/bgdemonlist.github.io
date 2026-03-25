import {
	ref,
	orderByChild,
	query,
	get,
	update,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import {
	ref as sRef,
	getDownloadURL,
	uploadBytes,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import {
	auth,
	byId,
	db,
	initAuthNavigation,
	normalizeKey,
	setText,
	storage,
} from './app-common.js';

const PROVINCE_MAP = {
	E: 'Blagoevgrad',
	A: 'Burgas',
	B: 'Varna',
	BT: 'Veliko Tarnovo',
	BH: 'Vidin',
	BP: 'Vratsa',
	EB: 'Gabrovo',
	TX: 'Dobrich',
	K: 'Kardzhali',
	KH: 'Kyustendil',
	OB: 'Lovech',
	M: 'Montana',
	PA: 'Pazardzhik',
	PK: 'Pernik',
	EH: 'Pleven',
	PB: 'Plovdiv',
	PP: 'Razgrad',
	P: 'Ruse',
	CC: 'Silistra',
	CH: 'Sliven',
	CM: 'Smolyan',
	CO: 'Sofia Province',
	C: 'Sofia',
	CT: 'Stara Zagora',
	T: 'Targovishte',
	X: 'Haskovo',
	H: 'Shumen',
	Y: 'Yambol',
};

const ALLOWED_ICON_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const ICON_MIME_BY_EXTENSION = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
};

const leaderboard = byId('players-list');
const playerIcon = byId('player-icon');
const playerSearch = byId('player-search');
const playerName = byId('player-name');
const hardestText = byId('hardest-text');
const pointsText = byId('points-text');
const rankText = byId('rank-text');
const completionsText = byId('completions-text');
const completionsList = byId('completions-list');
const playerProvince = byId('player-province');
const provinceFilter = byId('province-filter');

const editPlayerOverlay = byId('edit-player-overlay');
const editPlayerForm = byId('edit-player-form');
const editPlayerNameInput = byId('edit-player-name');
const editPlayerImageInput = byId('edit-player-image');
const editPlayerProvinceSelect = byId('edit-player-province');
const editPlayerCloseBtn = byId('edit-player-close');
const editPlayerCancelBtn = byId('edit-player-cancel');
const editPlayerSaveBtn = byId('edit-player-save');

const playerList = [];
const levelPositionByName = new Map();

let selectedPlayerIndex = -1;
let isSignedIn = false;
let isSavingPlayerEdit = false;
const playerIconDataCache = new Map();
const playerIconRequestCache = new Map();
let defaultPlayerIconUrlPromise = null;
let latestPlayerIconRenderRequest = 0;

initAuthNavigation();

onAuthStateChanged(auth, (user) => {
	isSignedIn = Boolean(user);
	updatePlayerNameEditability();

	if (!isSignedIn) {
		closeEditPlayerPopup();
	}
});

function normalizeProvince(code) {
	return code ? String(code).trim().toUpperCase() : '';
}

function getProvinceName(code) {
	const normalized = normalizeProvince(code);
	return PROVINCE_MAP[normalized] || normalized || 'Unknown';
}

function getPositionFromLevelName(name) {
	return levelPositionByName.get(name) ?? Infinity;
}

function calculatePoints(pos) {
	if (!Number.isFinite(pos)) {
		return 0;
	}

	if (pos <= 20) {
		return 322.2 * 0.945 ** (pos - 1) + 0.8;
	}

	if (pos <= 400) {
		return 106.2 * 0.9882 ** (pos - 20);
	}

	return 1;
}

function getSortedRecords(player) {
	return Object.values(player.records ?? {}).sort(
		(a, b) =>
			getPositionFromLevelName(a.name) - getPositionFromLevelName(b.name),
	);
}

function applyFilters() {
	const nameValue = playerSearch?.value.toLowerCase().trim() ?? '';
	const provinceValue = normalizeProvince(provinceFilter?.value);

	playerList.forEach((player) => {
		const matchesName = player.name.toLowerCase().includes(nameValue);
		const playerProvinceValue = normalizeProvince(player.province);
		const matchesProvince =
			!provinceValue || playerProvinceValue === provinceValue;

		player.element?.classList.toggle(
			'hide',
			!(matchesName && matchesProvince),
		);
	});
}

function buildProvinceDropdown() {
	const provinces = new Set();

	playerList.forEach((player) => {
		const code = normalizeProvince(player.province);
		if (code && PROVINCE_MAP[code]) {
			provinces.add(code);
		}
	});

	if (!provinceFilter) {
		return;
	}

	provinceFilter.innerHTML = '';
	const allOption = document.createElement('option');
	allOption.value = '';
	setText(allOption, 'All');
	provinceFilter.append(allOption);

	[...provinces]
		.sort((a, b) => getProvinceName(a).localeCompare(getProvinceName(b)))
		.forEach((code) => {
			const option = document.createElement('option');
			option.value = code;
			setText(option, getProvinceName(code));
			provinceFilter.append(option);
		});
}

function populateEditProvinceOptions(selectedCode = '') {
	if (!editPlayerProvinceSelect) {
		return;
	}

	if (!editPlayerProvinceSelect.dataset.initialized) {
		editPlayerProvinceSelect.innerHTML = '';

		const noneOption = document.createElement('option');
		noneOption.value = '';
		setText(noneOption, 'No province');
		editPlayerProvinceSelect.append(noneOption);

		Object.entries(PROVINCE_MAP)
			.sort(([, a], [, b]) => a.localeCompare(b))
			.forEach(([code, name]) => {
				const option = document.createElement('option');
				option.value = code;
				setText(option, `${name} (${code})`);
				editPlayerProvinceSelect.append(option);
			});

		editPlayerProvinceSelect.dataset.initialized = 'true';
	}

	const normalized = normalizeProvince(selectedCode);
	if (normalized && !PROVINCE_MAP[normalized]) {
		const exists = Array.from(editPlayerProvinceSelect.options).some(
			(option) => option.value === normalized,
		);
		if (!exists) {
			const customOption = document.createElement('option');
			customOption.value = normalized;
			setText(customOption, `${normalized} (Custom)`);
			editPlayerProvinceSelect.append(customOption);
		}
	}

	editPlayerProvinceSelect.value = normalized;
	if (editPlayerProvinceSelect.value !== normalized) {
		editPlayerProvinceSelect.value = '';
	}
}

async function setPlayerIcon(player) {
	if (!playerIcon) {
		return;
	}

	const requestId = ++latestPlayerIconRenderRequest;
	const iconData = await getPlayerIconData(
		getPlayerIconBaseName(player),
		player.iconExtension,
	);
	if (requestId !== latestPlayerIconRenderRequest) {
		return;
	}

	if (iconData?.url) {
		player.iconExtension = iconData.extension;
		playerIcon.src = iconData.url;
		return;
	}

	const defaultIconUrl = await getDefaultPlayerIconUrl();
	if (requestId === latestPlayerIconRenderRequest) {
		playerIcon.src = defaultIconUrl || '';
	}
}

function getPlayerIconBaseName(player) {
	return String(player?.iconBaseName || player?.name || '').trim();
}

function normalizeIconExtension(value) {
	const extension = String(value || '').trim().toLowerCase().replace('.', '');
	return ALLOWED_ICON_EXTENSIONS.includes(extension) ? extension : '';
}

function getAllowedIconExtensions(preferredExtension = '') {
	const normalizedPreferred = normalizeIconExtension(preferredExtension);
	if (!normalizedPreferred) {
		return [...ALLOWED_ICON_EXTENSIONS];
	}

	return [
		normalizedPreferred,
		...ALLOWED_ICON_EXTENSIONS.filter((ext) => ext !== normalizedPreferred),
	];
}

async function getPlayerIconData(playerName, preferredExtension = '') {
	const safeName = String(playerName || '').trim();
	if (!safeName) {
		return null;
	}

	if (playerIconDataCache.has(safeName)) {
		return playerIconDataCache.get(safeName);
	}

	if (playerIconRequestCache.has(safeName)) {
		return playerIconRequestCache.get(safeName);
	}

	const requestPromise = (async () => {
		const candidates = getAllowedIconExtensions(preferredExtension);
		for (const extension of candidates) {
			try {
				const iconRef = sRef(storage, `player-icons/${safeName}.${extension}`);
				const url = await getDownloadURL(iconRef);
				return {
					url,
					extension,
				};
			} catch {
				// Try next extension.
			}
		}

		return null;
	})()
		.then((iconData) => {
			playerIconDataCache.set(safeName, iconData);
			return iconData;
		})
		.finally(() => {
			playerIconRequestCache.delete(safeName);
		});

	playerIconRequestCache.set(safeName, requestPromise);
	return requestPromise;
}

async function getDefaultPlayerIconUrl() {
	if (!defaultPlayerIconUrlPromise) {
		defaultPlayerIconUrlPromise = getDownloadURL(
			sRef(storage, 'player-icons/default-user-icon.png'),
		).catch(() => '');
	}

	return defaultPlayerIconUrlPromise;
}

function clearPlayerIconCacheForNames(names = []) {
	names.forEach((name) => {
		const safeName = String(name || '').trim();
		if (!safeName) {
			return;
		}

		playerIconDataCache.delete(safeName);
		playerIconRequestCache.delete(safeName);
	});
}

function prefetchPlayerIcons(limit = 20) {
	const playersToPrefetch = playerList
		.filter((player) => getPlayerIconBaseName(player))
		.slice(0, limit);

	if (!playersToPrefetch.length) {
		return;
	}

	const maxConcurrency = Math.min(4, playersToPrefetch.length);
	let cursor = 0;

	for (let worker = 0; worker < maxConcurrency; worker += 1) {
		(async () => {
			while (cursor < playersToPrefetch.length) {
				const currentIndex = cursor;
				cursor += 1;
				const player = playersToPrefetch[currentIndex];

				try {
					const iconData = await getPlayerIconData(
						getPlayerIconBaseName(player),
						player.iconExtension,
					);
					if (iconData?.extension && !player.iconExtension) {
						player.iconExtension = iconData.extension;
					}
				} catch {
					// No-op: prefetch should never block UI rendering.
				}
			}
		})();
	}
}

function renderCompletions(records) {
	completionsList.innerHTML = '';

	records.forEach((record, index) => {
		const item = document.createElement('li');
		const link = document.createElement('a');
		link.href = record.video || '#';
		if (record.video) {
			link.target = '_blank';
			link.rel = 'noopener noreferrer';
		}

		const title = document.createElement('h2');
		if (record.first) {
			title.id = 'first';
		}
		setText(title, record.name, 'Unknown');
		link.append(title);
		item.append(link);
		completionsList.append(item);

		if (index < records.length - 1) {
			const separator = document.createElement('li');
			setText(separator, '-');
			completionsList.append(separator);
		}
	});
}

function updatePlayerNameEditability() {
	if (!playerName) {
		return;
	}

	const canEdit = isSignedIn && selectedPlayerIndex >= 0;
	playerName.classList.toggle('editable-player-name', canEdit);
	playerName.title = canEdit
		? 'Click to edit username and profile picture'
		: '';
}

async function renderSelectedPlayer(index) {
	const player = playerList[index];
	selectedPlayerIndex = index;

	if (!player) {
		selectedPlayerIndex = -1;
		setText(playerName, 'No players yet');
		setText(hardestText, '-');
		setText(pointsText, '0.00');
		setText(rankText, '-');
		setText(completionsText, '0 (0 FVs)');
		completionsList.innerHTML = '';
		if (playerProvince) {
			playerProvince.src = '';
		}
		if (playerIcon) {
			playerIcon.src = '';
		}
		updatePlayerNameEditability();
		return;
	}

	const records = getSortedRecords(player);
	const firstVictories = records.filter((record) => record.first).length;

	setText(playerName, player.name, 'Unknown');
	setText(hardestText, player.hardest?.name ?? '-');
	setText(
		pointsText,
		Number.isFinite(player.points) ? player.points.toFixed(2) : 'Infinity',
	);
	setText(rankText, `#${index + 1}`);
	setText(completionsText, `${records.length} (${firstVictories} FVs)`);
	renderCompletions(records);

	if (playerProvince) {
		playerProvince.src = player.province
			? `./assets/${normalizeProvince(player.province)}.png`
			: '';
	}

	updatePlayerNameEditability();
	await setPlayerIcon(player);
}

function createPlayerListItem(player, displayRank) {
	const row = document.createElement('div');
	row.className =
		displayRank % 2 === 0 ? 'player-container-2' : 'player-container-1';
	row.addEventListener('click', () => {
		renderSelectedPlayer(playerList.indexOf(player)).catch((error) => {
			console.error('Failed to render player details.', error);
		});
	});

	const provinceImage = document.createElement('img');
	if (player.province) {
		provinceImage.src = `./assets/${normalizeProvince(player.province)}.png`;
		provinceImage.alt = `${getProvinceName(player.province)} flag`;
	}
	row.append(provinceImage);

	const textWrapper = document.createElement('div');
	const nameHeading = document.createElement('h2');
	setText(nameHeading, `#${displayRank} - ${player.name}`);
	const scoreHeading = document.createElement('h3');
	setText(
		scoreHeading,
		Number.isFinite(player.points) ? player.points.toFixed(2) : 'Infinity',
	);
	textWrapper.append(nameHeading, scoreHeading);
	row.append(textWrapper);

	const listItem = document.createElement('li');
	listItem.append(row);
	player.element = listItem;
	return listItem;
}

async function loadData() {
	playerList.length = 0;
	levelPositionByName.clear();

	const [usersSnapshot, levelsSnapshot] = await Promise.all([
		get(ref(db, 'users')),
		get(query(ref(db, 'levels'), orderByChild('pos'))),
	]);

	levelsSnapshot.forEach((levelSnapshot) => {
		const level = levelSnapshot.val();
		if (!level?.name || typeof level.pos !== 'number') {
			return;
		}

		levelPositionByName.set(level.name, level.pos);
	});

	usersSnapshot.forEach((userSnapshot) => {
		const player = userSnapshot.val();
		const records = Object.values(player?.records ?? {});
		if (!player?.name || !records.length) {
			return;
		}

		const hardest = records.reduce((currentHardest, record) => {
			return getPositionFromLevelName(record.name) <
				getPositionFromLevelName(currentHardest.name)
				? record
				: currentHardest;
		}, records[0]);

		const points = records.reduce((total, record) => {
			return total + calculatePoints(getPositionFromLevelName(record.name));
		}, 0);

		playerList.push({
			...player,
			userKey: userSnapshot.key,
			hardest,
			points,
		});
	});

	playerList.sort((a, b) => b.points - a.points);
}

function renderLeaderboard() {
	leaderboard.innerHTML = '';

	let displayRank = 1;
	playerList.forEach((player) => {
		if (player.points === 0) {
			return;
		}

		leaderboard.append(createPlayerListItem(player, displayRank));
		displayRank += 1;
	});

	buildProvinceDropdown();
	applyFilters();
	prefetchPlayerIcons();
}

function closeEditPlayerPopup() {
	editPlayerOverlay?.classList.add('hide');
	editPlayerForm?.reset();
}

function openEditPlayerPopup() {
	if (!isSignedIn || selectedPlayerIndex < 0) {
		return;
	}

	const selectedPlayer = playerList[selectedPlayerIndex];
	if (!selectedPlayer || !editPlayerOverlay || !editPlayerNameInput) {
		return;
	}

	editPlayerNameInput.value = selectedPlayer.name;
	if (editPlayerImageInput) {
		editPlayerImageInput.value = '';
	}
	populateEditProvinceOptions(selectedPlayer.province);

	editPlayerOverlay.classList.remove('hide');
	editPlayerNameInput.focus();
	editPlayerNameInput.select();
}

function isInvalidDatabaseKey(value) {
	return /[.#$/\[\]]/.test(value);
}

function getImageFileExtension(file) {
	if (!file) {
		return '';
	}

	const mimeType = String(file.type || '').toLowerCase();
	if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
		return 'jpg';
	}
	if (mimeType === 'image/png') {
		return 'png';
	}
	if (mimeType === 'image/webp') {
		return 'webp';
	}

	const name = String(file.name || '').toLowerCase();
	if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
		return 'jpg';
	}
	if (name.endsWith('.png')) {
		return 'png';
	}
	if (name.endsWith('.webp')) {
		return 'webp';
	}

	return '';
}

function isSupportedImageFile(file) {
	if (!file) {
		return true;
	}

	return Boolean(getImageFileExtension(file));
}

async function refreshLeaderboard(preferredPlayerName = '') {
	await loadData();
	renderLeaderboard();

	if (!playerList.length) {
		await renderSelectedPlayer(-1);
		return;
	}

	const normalizedPreferredName = normalizeKey(preferredPlayerName);
	const targetIndex = normalizedPreferredName
		? playerList.findIndex(
				(player) => normalizeKey(player.name) === normalizedPreferredName,
			)
		: -1;

	await renderSelectedPlayer(targetIndex >= 0 ? targetIndex : 0);
}

async function handleEditPlayerSubmit(event) {
	event.preventDefault();

	if (!isSignedIn) {
		alert('You must be signed in to edit players.');
		return;
	}

	if (isSavingPlayerEdit) {
		return;
	}

	const selectedPlayer = playerList[selectedPlayerIndex];
	if (!selectedPlayer) {
		alert('Select a player first.');
		return;
	}

	const newName = editPlayerNameInput?.value.trim() ?? '';
	const selectedImageFile = editPlayerImageInput?.files?.[0] ?? null;
	const selectedImageExtension = getImageFileExtension(selectedImageFile);
	const selectedProvince = normalizeProvince(editPlayerProvinceSelect?.value);
	const oldName = selectedPlayer.name;
	const oldUserKey = selectedPlayer.userKey || oldName;

	if (!newName) {
		alert('Username cannot be empty.');
		return;
	}

	if (isInvalidDatabaseKey(newName)) {
		alert('Username contains invalid characters for Firebase keys.');
		return;
	}

	if (!isSupportedImageFile(selectedImageFile)) {
		alert('Only JPG, PNG, and WEBP images are allowed.');
		return;
	}

	isSavingPlayerEdit = true;
	if (editPlayerSaveBtn) {
		editPlayerSaveBtn.disabled = true;
	}

	try {
		const [usersSnapshot, levelsSnapshot] = await Promise.all([
			get(ref(db, 'users')),
			get(ref(db, 'levels')),
		]);
		const oldUserSnapshot = usersSnapshot.child(oldUserKey);

		if (!oldUserSnapshot.exists()) {
			alert('Player could not be found. Refreshing...');
			await refreshLeaderboard();
			closeEditPlayerPopup();
			return;
		}

		if (newName !== oldUserKey && usersSnapshot.child(newName).exists()) {
			alert('A player with that username already exists.');
			return;
		}

		const oldUserData = oldUserSnapshot.val() ?? {};
		const oldProvince = normalizeProvince(oldUserData.province);
		const oldIconExtension = normalizeIconExtension(oldUserData.iconExtension);
		const oldIconBaseName = String(
			oldUserData.iconBaseName || oldUserKey || oldName,
		).trim();
		let finalIconExtension = oldIconExtension;
		let finalIconBaseName = oldIconBaseName;
		const updates = {};
		const oldNameKeys = new Set([
			normalizeKey(oldName),
			normalizeKey(oldUserKey),
			normalizeKey(oldUserData.name),
		]);
		const newRecordKey = normalizeKey(newName);
		const conflictingLevels = [];

		if (selectedImageFile && selectedImageExtension) {
			finalIconExtension = selectedImageExtension;
			finalIconBaseName = newName;
			await uploadBytes(
				sRef(storage, `player-icons/${newName}.${selectedImageExtension}`),
				selectedImageFile,
				{
					contentType:
						selectedImageFile.type ||
						ICON_MIME_BY_EXTENSION[selectedImageExtension] ||
						'application/octet-stream',
				},
			);
		}

		if (newName !== oldUserKey) {
			const newUserData = {
				...oldUserData,
				name: newName,
			};
			if (selectedProvince) {
				newUserData.province = selectedProvince;
			} else {
				delete newUserData.province;
			}
			newUserData.iconBaseName = finalIconBaseName || newName;
			if (finalIconExtension) {
				newUserData.iconExtension = finalIconExtension;
			} else {
				delete newUserData.iconExtension;
			}

			updates[`users/${newName}`] = {
				...newUserData,
			};
			updates[`users/${oldUserKey}`] = null;
		} else if (oldUserData.name !== newName) {
			updates[`users/${oldUserKey}/name`] = newName;
		}

		if (newName === oldUserKey && selectedProvince !== oldProvince) {
			updates[`users/${oldUserKey}/province`] = selectedProvince || null;
		}

		if (newName === oldUserKey && finalIconExtension !== oldIconExtension) {
			updates[`users/${oldUserKey}/iconExtension`] =
				finalIconExtension || null;
		}
		if (newName === oldUserKey) {
			const previousBaseName = String(
				oldUserData.iconBaseName || oldUserKey,
			).trim();
			if (finalIconBaseName !== previousBaseName) {
				updates[`users/${oldUserKey}/iconBaseName`] =
					finalIconBaseName || null;
			}
		}

		levelsSnapshot.forEach((levelSnapshot) => {
			const levelKey = levelSnapshot.key;
			const levelValue = levelSnapshot.val() ?? {};
			const records = levelValue.records ?? {};
			let matchedRecordKey = null;

			Object.entries(records).some(([recordKey, recordValue]) => {
				const normalizedRecordName = normalizeKey(recordValue?.name);
				if (
					oldNameKeys.has(recordKey) ||
					oldNameKeys.has(normalizedRecordName)
				) {
					matchedRecordKey = recordKey;
					return true;
				}

				return false;
			});

			if (!matchedRecordKey) {
				return;
			}

			const recordValue = records[matchedRecordKey] ?? {};
			const updatedRecord = {
				...recordValue,
				name: newName,
			};

			if (matchedRecordKey !== newRecordKey) {
				if (records[newRecordKey] && newRecordKey !== matchedRecordKey) {
					conflictingLevels.push(levelValue.name || levelKey);
					return;
				}

				updates[`levels/${levelKey}/records/${newRecordKey}`] = updatedRecord;
				updates[`levels/${levelKey}/records/${matchedRecordKey}`] = null;
				return;
			}

			updates[`levels/${levelKey}/records/${matchedRecordKey}/name`] = newName;
		});

		if (conflictingLevels.length) {
			alert(
				`Could not rename player because some level records would conflict: ${conflictingLevels.join(
					', ',
				)}`,
			);
			return;
		}

		if (Object.keys(updates).length) {
			await update(ref(db), updates);
		}

		clearPlayerIconCacheForNames([
			oldName,
			oldUserKey,
			oldIconBaseName,
			newName,
			finalIconBaseName,
		]);
		closeEditPlayerPopup();
		await refreshLeaderboard(newName);
	} catch (error) {
		console.error('Failed to update player.', error);
		alert('Could not update player. Please try again.');
	} finally {
		isSavingPlayerEdit = false;
		if (editPlayerSaveBtn) {
			editPlayerSaveBtn.disabled = false;
		}
	}
}

playerName?.addEventListener('click', () => {
	openEditPlayerPopup();
});

editPlayerCloseBtn?.addEventListener('click', () => {
	closeEditPlayerPopup();
});

editPlayerCancelBtn?.addEventListener('click', () => {
	closeEditPlayerPopup();
});

editPlayerOverlay?.addEventListener('click', (event) => {
	if (event.target === editPlayerOverlay) {
		closeEditPlayerPopup();
	}
});

document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') {
		closeEditPlayerPopup();
	}
});

editPlayerForm?.addEventListener('submit', handleEditPlayerSubmit);
playerSearch?.addEventListener('input', applyFilters);
provinceFilter?.addEventListener('change', applyFilters);

loadData()
	.then(() => {
		renderLeaderboard();
		return renderSelectedPlayer(0);
	})
	.catch((error) => {
		console.error('Failed to load leaderboard.', error);
		return renderSelectedPlayer(-1);
	});
