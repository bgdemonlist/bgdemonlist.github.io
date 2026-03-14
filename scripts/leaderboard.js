import {
	ref,
	orderByChild,
	query,
	get,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import {
	ref as sRef,
	getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js';
import {
	byId,
	db,
	initAuthNavigation,
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

const playerList = [];
const levelPositionByName = new Map();

initAuthNavigation();

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

async function setPlayerIcon(player) {
	if (!playerIcon) {
		return;
	}

	try {
		playerIcon.src = await getDownloadURL(
			sRef(storage, `player-icons/${player.name}.jpg`),
		);
	} catch {
		playerIcon.src = await getDownloadURL(
			sRef(storage, 'player-icons/default-user-icon.png'),
		);
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

async function renderSelectedPlayer(index) {
	const player = playerList[index];
	if (!player) {
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
			return (
				total + calculatePoints(getPositionFromLevelName(record.name))
			);
		}, 0);

		playerList.push({
			...player,
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
}

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
