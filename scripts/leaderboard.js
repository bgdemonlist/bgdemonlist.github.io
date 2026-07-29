import {
	ref,
	orderByChild,
	query,
	get,
	update,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import {
	auth,
	byId,
	db,
	initAuthNavigation,
	normalizeKey,
	setText,
	PACK_BONUS_MULTIPLIER,
	calculatePackLevelPointsSum,
	calculatePackBonusPoints,
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

const leaderboard = byId('players-list');
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
const editPlayerProvinceSelect = byId('edit-player-province');
const editPlayerCloseBtn = byId('edit-player-close');
const editPlayerCancelBtn = byId('edit-player-cancel');
const editPlayerSaveBtn = byId('edit-player-save');

const completedPacksList = byId('completed-packs-list');
const packsOverlay = byId('packs-overlay');
const packsModalClose = byId('packs-modal-close');
const packsModalList = byId('packs-modal-list');

const playerList = [];
const allPacksList = [];
const levelPositionByName = new Map();

let selectedPlayerIndex = -1;
let isSignedIn = false;
let isSavingPlayerEdit = false;

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
		? 'Click to edit player details'
		: '';
}

function isPackCompletedByPlayer(pack, player) {
	if (!pack || !Array.isArray(pack.levels) || !pack.levels.length || !player) {
		return false;
	}
	const completedSet = new Set(
		Object.values(player.records ?? {}).map((r) => normalizeKey(r.name)),
	);
	return pack.levels.every((lvl) => completedSet.has(normalizeKey(lvl)));
}

function renderCompletedPacks(player) {
	if (!completedPacksList) return;
	completedPacksList.innerHTML = '';

	if (!player) {
		return;
	}

	const completedPacks = allPacksList.filter((pack) =>
		isPackCompletedByPlayer(pack, player),
	);

	if (!completedPacks.length) {
		const msg = document.createElement('div');
		msg.className = 'no-packs-msg';

		const textSpan = document.createElement('span');
		setText(textSpan, 'No completed packs yet');

		const link = document.createElement('a');
		link.href = '#';
		link.className = 'view-all-packs-link';
		setText(link, 'View all level packs');
		link.addEventListener('click', (e) => {
			e.preventDefault();
			openPacksModal();
		});

		msg.append(
			textSpan,
			document.createTextNode(' ('),
			link,
			document.createTextNode(')'),
		);
		completedPacksList.append(msg);
		return;
	}

	completedPacks.forEach((pack) => {
		const badge = document.createElement('button');
		badge.type = 'button';
		badge.className = 'profile-pack-badge';
		badge.style.borderColor = pack.color || '#e2495c';

		const nameSpan = document.createElement('span');
		setText(nameSpan, pack.name);

		badge.append(nameSpan);
		badge.addEventListener('click', () => {
			openPacksModal(pack.key || pack.id);
		});

		completedPacksList.append(badge);
	});
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
		if (completedPacksList) completedPacksList.innerHTML = '';
		if (playerProvince) {
			playerProvince.src = '';
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
	renderCompletedPacks(player);

	if (playerProvince) {
		playerProvince.src = player.province
			? `./assets/${normalizeProvince(player.province)}.png`
			: '';
	}

	updatePlayerNameEditability();
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
	allPacksList.length = 0;
	levelPositionByName.clear();

	const [usersSnapshot, levelsSnapshot, packsSnapshot, tiersSnapshot] = await Promise.all([
		get(ref(db, 'users')),
		get(query(ref(db, 'levels'), orderByChild('pos'))),
		get(ref(db, 'packs')),
		get(ref(db, 'tiers')),
	]);

	const tiersMap = new Map();
	tiersSnapshot.forEach((snap) => {
		const tier = snap.val();
		if (tier && tier.name) {
			tiersMap.set(snap.key, {
				key: snap.key,
				...tier,
			});
		}
	});

	levelsSnapshot.forEach((levelSnapshot) => {
		const level = levelSnapshot.val();
		if (!level?.name || typeof level.pos !== 'number') {
			return;
		}

		levelPositionByName.set(level.name, level.pos);
	});

	packsSnapshot.forEach((packSnapshot) => {
		const pack = packSnapshot.val();
		if (pack && pack.name && Array.isArray(pack.levels)) {
			const assignedTier = pack.tierId ? tiersMap.get(pack.tierId) : null;
			allPacksList.push({
				key: packSnapshot.key,
				...pack,
				color: assignedTier ? assignedTier.color : (pack.color || '#e2495c'),
				tierName: assignedTier ? assignedTier.name : null,
			});
		}
	});

	allPacksList.sort((a, b) => {
		const tierA = a.tierId ? tiersMap.get(a.tierId) : null;
		const tierB = b.tierId ? tiersMap.get(b.tierId) : null;

		const tierPosA = tierA && typeof tierA.pos === 'number' ? tierA.pos : Infinity;
		const tierPosB = tierB && typeof tierB.pos === 'number' ? tierB.pos : Infinity;

		if (tierPosA !== tierPosB) {
			return tierPosA - tierPosB;
		}

		const packPosA = typeof a.pos === 'number' ? a.pos : 9999;
		const packPosB = typeof b.pos === 'number' ? b.pos : 9999;
		return packPosA - packPosB;
	});

	// Compute completion bonus points per pack
	allPacksList.forEach((pack) => {
		const baseSum = calculatePackLevelPointsSum(
			pack.levels,
			levelPositionByName,
			calculatePoints,
		);
		pack.baseLevelPointsSum = baseSum;
		pack.bonusPoints = calculatePackBonusPoints(pack, baseSum);
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

		const baseLevelPoints = records.reduce((total, record) => {
			return total + calculatePoints(getPositionFromLevelName(record.name));
		}, 0);

		let packBonusPoints = 0;
		allPacksList.forEach((pack) => {
			if (isPackCompletedByPlayer(pack, player)) {
				packBonusPoints += pack.bonusPoints || 0;
			}
		});

		const totalPoints = baseLevelPoints + packBonusPoints;

		playerList.push({
			...player,
			userKey: userSnapshot.key,
			hardest,
			baseLevelPoints,
			packBonusPoints,
			points: totalPoints,
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
	populateEditProvinceOptions(selectedPlayer.province);

	editPlayerOverlay.classList.remove('hide');
	editPlayerNameInput.focus();
	editPlayerNameInput.select();
}

function isInvalidDatabaseKey(value) {
	return /[.#$/\[\]]/.test(value);
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
		const updates = {};
		const oldNameKeys = new Set([
			normalizeKey(oldName),
			normalizeKey(oldUserKey),
			normalizeKey(oldUserData.name),
		]);
		const newRecordKey = normalizeKey(newName);
		const conflictingLevels = [];

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

function openPacksModal(highlightPackKey = null) {
	if (!packsOverlay) return;
	renderPacksModalContent(highlightPackKey);
	packsOverlay.classList.remove('hide');
}

function closePacksModal() {
	if (!packsOverlay) return;
	packsOverlay.classList.add('hide');
}

function renderPacksModalContent(highlightPackKey = null) {
	if (!packsModalList) return;
	packsModalList.innerHTML = '';

	if (!allPacksList.length) {
		packsModalList.innerHTML =
			'<div class="no-packs-msg">No level packs available yet.</div>';
		return;
	}

	const selectedPlayer = playerList[selectedPlayerIndex];
	const playerCompletedSet = selectedPlayer
		? new Set(
				Object.values(selectedPlayer.records ?? {}).map((r) =>
					normalizeKey(r.name),
				),
			)
		: new Set();

	allPacksList.forEach((pack) => {
		const card = document.createElement('div');
		card.className = 'modal-pack-card';
		card.style.borderColor = pack.color || '#e2495c';

		const packKey = pack.key || pack.id;
		if (highlightPackKey && packKey === highlightPackKey) {
			card.classList.add('highlighted-pack');
		}

		const levels = Array.isArray(pack.levels) ? pack.levels : [];
		const completedCount = levels.filter((lvl) =>
			playerCompletedSet.has(normalizeKey(lvl)),
		).length;
		const isFullyCompleted =
			levels.length > 0 && completedCount === levels.length;

		if (isFullyCompleted) {
			card.classList.add('completed-pack');
		}

		const header = document.createElement('div');
		header.className = 'modal-pack-header';

		const titleDiv = document.createElement('div');
		titleDiv.className = 'modal-pack-title';

		const titleText = document.createElement('h3');
		setText(titleText, pack.name);

		titleDiv.append(titleText);

		if (pack.tierName) {
			const tierBadge = document.createElement('span');
			tierBadge.className = 'pack-tier-tag';
			tierBadge.style.backgroundColor = `${pack.color || '#e2495c'}22`;
			tierBadge.style.color = pack.color || '#e2495c';
			tierBadge.style.borderColor = pack.color || '#e2495c';
			setText(tierBadge, pack.tierName);
			titleDiv.append(tierBadge);
		}

		if (pack.bonusPoints && pack.bonusPoints > 0) {
			const bonusTag = document.createElement('span');
			bonusTag.className = 'pack-bonus-tag';
			setText(bonusTag, `+${pack.bonusPoints.toFixed(1)} pts bonus`);
			titleDiv.append(bonusTag);
		}

		const statusBadge = document.createElement('span');
		statusBadge.className = isFullyCompleted
			? 'pack-status-badge completed'
			: 'pack-status-badge';

		if (selectedPlayer) {
			setText(
				statusBadge,
				isFullyCompleted
					? 'COMPLETED'
					: `${completedCount} / ${levels.length}`,
			);
		} else {
			setText(statusBadge, `${levels.length} levels`);
		}

		header.append(titleDiv, statusBadge);

		const levelsGrid = document.createElement('div');
		levelsGrid.className = 'modal-pack-levels-grid';

		levels.forEach((lvlName) => {
			const isCompleted = playerCompletedSet.has(normalizeKey(lvlName));
			const levelItem = document.createElement('div');
			levelItem.className = isCompleted
				? 'modal-level-item completed'
				: 'modal-level-item';

			const icon = document.createElement('i');
			icon.className = isCompleted
				? 'fa-solid fa-circle-check check-icon'
				: 'fa-regular fa-circle uncheck-icon';

			const pos = levelPositionByName.get(lvlName);
			const levelNameElem = document.createElement('a');
			levelNameElem.className = 'modal-level-name';
			setText(levelNameElem, pos ? `#${pos} - ${lvlName}` : lvlName);
			if (pos) {
				levelNameElem.href = `level.html?pos=${pos}`;
			}

			levelItem.append(icon, levelNameElem);
			levelsGrid.append(levelItem);
		});

		card.append(header, levelsGrid);
		packsModalList.append(card);

		if (highlightPackKey && packKey === highlightPackKey) {
			setTimeout(() => {
				card.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}, 120);
		}
	});
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

packsModalClose?.addEventListener('click', () => {
	closePacksModal();
});

packsOverlay?.addEventListener('click', (event) => {
	if (event.target === packsOverlay) {
		closePacksModal();
	}
});

document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') {
		closeEditPlayerPopup();
		closePacksModal();
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
