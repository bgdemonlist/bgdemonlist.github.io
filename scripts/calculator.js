import {
	byId,
	calculatePackBonusPoints,
	calculatePoints,
	getLeaderboardBundleCached,
	initAuthNavigation,
	normalizeKey,
	setText,
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

// DOM references
const playerPickerInput = byId('player-picker-input');
const playerPickerClear = byId('player-picker-clear');
const playerPickerDropdown = byId('player-picker-dropdown');
const startBlankBtn = byId('start-blank-btn');
const resetSimBtn = byId('reset-sim-btn');

const activeProfileFlag = byId('active-profile-flag');
const activeProfileBadge = byId('active-profile-badge');
const activeProfileName = byId('active-profile-name');
const calcLoadingStatus = byId('calc-loading-status');

const statPointsValue = byId('stat-points-value');
const statPointsDelta = byId('stat-points-delta');
const statPointsSub = byId('stat-points-sub');
const statRankValue = byId('stat-rank-value');
const statRankDelta = byId('stat-rank-delta');
const statRankSub = byId('stat-rank-sub');
const statCompletionsValue = byId('stat-completions-value');
const statCompletionsDelta = byId('stat-completions-delta');
const statCompletionsSub = byId('stat-completions-sub');
const statHardestValue = byId('stat-hardest-value');
const statHardestBadge = byId('stat-hardest-badge');
const statHardestSub = byId('stat-hardest-sub');

const tabExisting = byId('tab-existing');
const tabUnplaced = byId('tab-unplaced');
const panelExisting = byId('panel-existing');
const panelUnplaced = byId('panel-unplaced');

const existingLevelSearch = byId('existing-level-search');
const hideCompletedToggle = byId('hide-completed-toggle');
const existingLevelsList = byId('existing-levels-list');

const unplacedForm = byId('unplaced-form');
const unplacedNameInput = byId('unplaced-name');
const unplacedPosInput = byId('unplaced-pos');
const unplacedAnchorSelect = byId('unplaced-anchor-select');
const unplacedPreviewNeighbors = byId('unplaced-preview-neighbors');
const unplacedPreviewLevelPts = byId('unplaced-preview-level-pts');
const unplacedPreviewNetPts = byId('unplaced-preview-net-pts');
const shiftListToggle = byId('shift-list-toggle');

const recordsCountPill = byId('records-count-pill');
const recordFilterBtns = document.querySelectorAll('.records-filter-group .filter-chip');
const shiftNoticeBanner = byId('shift-notice-banner');
const recordsList = byId('records-list');

const calcPacksTotal = byId('calc-packs-total');
const calcCompletedPacks = byId('calc-completed-packs');
const calcAlmostPacksWrap = byId('calc-almost-packs-wrap');
const calcAlmostPacks = byId('calc-almost-packs');

const jumpToMeBtn = byId('jump-to-me-btn');
const lbSearchInput = byId('lb-search-input');
const lbViewAllBtn = byId('lb-view-all');
const lbViewNearbyBtn = byId('lb-view-nearby');
const lbShiftNote = byId('lb-shift-note');
const simLeaderboardList = byId('sim-leaderboard-list');

// Loaded baseline data
let baseLevels = []; // [{ key, name, creator, video, pos, normKey }]
let baseLevelByKey = new Map(); // normKey -> baseLevel
let baseLevelPosByKey = new Map(); // normKey -> pos
let allPacks = []; // [{ key, name, levels, color, tierName, bonusPercent, bonusFlat, baseBonusPoints }]
let basePlayers = []; // sorted by baseline points desc
let basePlayerByUserKey = new Map(); // userKey -> player

// Simulation state
let selectedUserKey = null; // null = Blank / Custom Player
const excludedRealKeys = new Set(); // normKey of real records temporarily excluded
const fakeExistingKeys = new Set(); // normKey of existing levels added as simulated
let customLevels = []; // [{ id, name, pos }]
let nextCustomId = 1;
let shiftListEnabled = true;

let activeAddTab = 'existing';
let activeRecordFilter = 'all';
let lbViewMode = 'all';
let pickerOpen = false;
let pickerHighlightIndex = -1;
let lastRenderedState = null;
let lastScrolledRank = null;
let isDataLoaded = false;

initAuthNavigation();

function normalizeProvince(code) {
	return code ? String(code).trim().toUpperCase() : '';
}

function getProvinceName(code) {
	const normalized = normalizeProvince(code);
	return PROVINCE_MAP[normalized] || normalized || '';
}

function formatSigned(value, decimals = 2) {
	if (!Number.isFinite(value)) return '0.00';
	const sign = value > 0 ? '+' : '';
	return `${sign}${value.toFixed(decimals)}`;
}

function formatPoints(value) {
	return Number.isFinite(value) ? value.toFixed(2) : '0.00';
}

function getSelectedPlayer() {
	return selectedUserKey ? basePlayerByUserKey.get(selectedUserKey) || null : null;
}

function hasSimulationChanges() {
	return (
		fakeExistingKeys.size > 0 ||
		customLevels.length > 0 ||
		excludedRealKeys.size > 0
	);
}

// Build simulated ordered list given current customLevels and shiftListEnabled
function buildSimulatedList(customs = customLevels, shiftEnabled = shiftListEnabled) {
	const simPosByKey = new Map();
	const simPosByExactName = new Map();
	const customPosById = new Map();

	if (!shiftEnabled || customs.length === 0) {
		const ordered = baseLevels.map((lvl) => {
			simPosByKey.set(lvl.normKey, lvl.pos);
			simPosByExactName.set(lvl.name, lvl.pos);
			return {
				isCustom: false,
				normKey: lvl.normKey,
				name: lvl.name,
				creator: lvl.creator,
				originalPos: lvl.pos,
				simPos: lvl.pos,
				points: calculatePoints(lvl.pos),
			};
		});

		customs.forEach((c) => {
			customPosById.set(c.id, c.pos);
		});

		return {
			orderedReal: ordered,
			combinedList: buildCombinedDisplayList(ordered, customs, false),
			simPosByKey,
			simPosByExactName,
			customPosById,
			totalListSize: baseLevels.length + (shiftEnabled ? customs.length : 0),
		};
	}

	const totalLen = baseLevels.length + customs.length;
	const slots = new Array(totalLen).fill(null);

	// Place custom levels in their target 1-based slots first
	const sortedCustoms = [...customs].sort((a, b) => a.pos - b.pos);
	sortedCustoms.forEach((c) => {
		let idx = Math.max(0, Math.min(totalLen - 1, c.pos - 1));
		while (idx < totalLen && slots[idx] !== null) {
			idx += 1;
		}
		if (idx >= totalLen) {
			idx = slots.findIndex((s) => s === null);
		}
		if (idx >= 0) {
			slots[idx] = {
				isCustom: true,
				id: c.id,
				name: c.name,
				simPos: idx + 1,
				points: calculatePoints(idx + 1),
			};
			customPosById.set(c.id, idx + 1);
		}
	});

	// Fill remaining slots with base levels in original relative order
	let baseIdx = 0;
	const orderedReal = [];
	for (let i = 0; i < totalLen; i += 1) {
		if (slots[i] === null && baseIdx < baseLevels.length) {
			const lvl = baseLevels[baseIdx];
			baseIdx += 1;
			const simPos = i + 1;
			const entry = {
				isCustom: false,
				normKey: lvl.normKey,
				name: lvl.name,
				creator: lvl.creator,
				originalPos: lvl.pos,
				simPos,
				points: calculatePoints(simPos),
			};
			slots[i] = entry;
			orderedReal.push(entry);
			simPosByKey.set(lvl.normKey, simPos);
			simPosByExactName.set(lvl.name, simPos);
		}
	}

	return {
		orderedReal,
		combinedList: slots.filter(Boolean),
		simPosByKey,
		simPosByExactName,
		customPosById,
		totalListSize: totalLen,
	};
}

function buildCombinedDisplayList(orderedReal, customs, shifted) {
	if (shifted) return orderedReal;
	const items = [
		...orderedReal,
		...customs.map((c) => ({
			isCustom: true,
			id: c.id,
			name: c.name,
			simPos: c.pos,
			points: calculatePoints(c.pos),
		})),
	];
	items.sort((a, b) => {
		if (a.simPos !== b.simPos) return a.simPos - b.simPos;
		if (a.isCustom !== b.isCustom) return a.isCustom ? -1 : 1;
		return 0;
	});
	return items;
}

function computePacksWithPositions(posByKey) {
	return allPacks.map((pack) => {
		let baseSum = 0;
		pack.levels.forEach((lvlName) => {
			const pos = posByKey.get(normalizeKey(lvlName)) ?? Infinity;
			baseSum += calculatePoints(pos);
		});
		const bonusPoints = calculatePackBonusPoints(pack, baseSum);
		return {
			...pack,
			simBaseSum: baseSum,
			simBonusPoints: bonusPoints,
		};
	});
}

function evaluatePlayerScore(completedKeysSet, simPosByKey, simPacks, extraCustomLevels = []) {
	let basePoints = 0;

	completedKeysSet.forEach((normKey) => {
		const pos = simPosByKey.get(normKey) ?? Infinity;
		basePoints += calculatePoints(pos);
	});

	extraCustomLevels.forEach((c) => {
		basePoints += calculatePoints(c.simPos ?? c.pos);
	});

	let packBonus = 0;
	const completedPacks = [];
	const almostPacks = [];

	simPacks.forEach((pack) => {
		if (!pack.levels.length) return;
		const missing = [];
		pack.levels.forEach((lvlName) => {
			if (!completedKeysSet.has(normalizeKey(lvlName))) {
				missing.push(lvlName);
			}
		});
		if (missing.length === 0) {
			packBonus += pack.simBonusPoints;
			completedPacks.push(pack);
		} else if (missing.length === 1) {
			almostPacks.push({
				pack,
				missingLevelName: missing[0],
				missingNormKey: normalizeKey(missing[0]),
			});
		}
	});

	return {
		basePoints,
		packBonus,
		totalPoints: basePoints + packBonus,
		completedPacks,
		almostPacks,
	};
}

function computeFullSimulation(overrideCustoms = customLevels, overrideShift = shiftListEnabled) {
	const listState = buildSimulatedList(overrideCustoms, overrideShift);
	const { simPosByKey, customPosById } = listState;
	const simPacks = computePacksWithPositions(simPosByKey);

	const selectedPlayer = getSelectedPlayer();
	const realRecordsMap = new Map(); // normKey -> record

	if (selectedPlayer) {
		selectedPlayer.recordsList.forEach((rec) => {
			const key = normalizeKey(rec.name);
			if (!realRecordsMap.has(key)) {
				realRecordsMap.set(key, rec);
			}
		});
	}

	// Active records for the simulated player
	const activeCompletedKeys = new Set();
	const activeRecordsList = [];

	// 1. Real records
	realRecordsMap.forEach((rec, normKey) => {
		const isExcluded = excludedRealKeys.has(normKey);
		const origPos = baseLevelPosByKey.get(normKey) ?? Infinity;
		const simPos = simPosByKey.get(normKey) ?? Infinity;
		const origPts = calculatePoints(origPos);
		const simPts = calculatePoints(simPos);

		if (!isExcluded) {
			activeCompletedKeys.add(normKey);
		}

		activeRecordsList.push({
			type: 'real',
			id: `real:${normKey}`,
			normKey,
			name: rec.name,
			first: Boolean(rec.first),
			excluded: isExcluded,
			originalPos: origPos,
			simPos,
			originalPts: origPts,
			simPts,
		});
	});

	// 2. Fake existing list records
	fakeExistingKeys.forEach((normKey) => {
		// Skip if already an active real record
		if (realRecordsMap.has(normKey) && !excludedRealKeys.has(normKey)) {
			return;
		}
		const lvl = baseLevelByKey.get(normKey);
		if (!lvl) return;

		activeCompletedKeys.add(normKey);
		const simPos = simPosByKey.get(normKey) ?? lvl.pos;
		activeRecordsList.push({
			type: 'fake',
			id: `fake:${normKey}`,
			normKey,
			name: lvl.name,
			first: false,
			excluded: false,
			originalPos: lvl.pos,
			simPos,
			originalPts: calculatePoints(lvl.pos),
			simPts: calculatePoints(simPos),
		});
	});

	// 3. Unplaced / custom records (First Victor)
	const resolvedCustoms = overrideCustoms.map((c) => {
		const resolvedPos = customPosById.get(c.id) ?? c.pos;
		return {
			...c,
			simPos: resolvedPos,
			simPts: calculatePoints(resolvedPos),
		};
	});

	resolvedCustoms.forEach((c) => {
		activeRecordsList.push({
			type: 'unplaced',
			id: c.id,
			normKey: `custom:${c.id}`,
			name: c.name,
			first: true,
			excluded: false,
			originalPos: null,
			simPos: c.simPos,
			originalPts: 0,
			simPts: c.simPts,
		});
	});

	// Sort active records by simulated position (hardest first)
	activeRecordsList.sort((a, b) => {
		const posA = Number.isFinite(a.simPos) ? a.simPos : Number.MAX_SAFE_INTEGER;
		const posB = Number.isFinite(b.simPos) ? b.simPos : Number.MAX_SAFE_INTEGER;
		if (posA !== posB) return posA - posB;
		if (a.type === 'unplaced' && b.type !== 'unplaced') return -1;
		if (b.type === 'unplaced' && a.type !== 'unplaced') return 1;
		return a.name.localeCompare(b.name);
	});

	const myEval = evaluatePlayerScore(
		activeCompletedKeys,
		simPosByKey,
		simPacks,
		resolvedCustoms,
	);

	// Compute shift impact on player's own baseline records (if existing player & shifted)
	let ownShiftDelta = 0;
	if (selectedPlayer && overrideShift && overrideCustoms.length > 0) {
		const ownOriginalKeys = new Set(realRecordsMap.keys());
		const shiftedOwnEval = evaluatePlayerScore(ownOriginalKeys, simPosByKey, simPacks, []);
		ownShiftDelta = shiftedOwnEval.totalPoints - selectedPlayer.baseTotalPoints;
	}

	// Hardest demon among non-excluded records
	const nonExcludedRecords = activeRecordsList.filter((r) => !r.excluded);
	const simulatedHardest = nonExcludedRecords.length > 0 ? nonExcludedRecords[0] : null;
	const baselineHardestKey = selectedPlayer?.hardest
		? normalizeKey(selectedPlayer.hardest.name)
		: null;
	const isNewHardest = Boolean(
		simulatedHardest &&
			(simulatedHardest.type !== 'real' ||
				(baselineHardestKey && simulatedHardest.normKey !== baselineHardestKey)),
	);

	// Baseline completed pack keys for "NEW" badge detection
	const baselinePackKeys = new Set(
		(selectedPlayer?.baseCompletedPacks || []).map((p) => p.key),
	);

	// Build simulated leaderboard for all players
	const simLeaderboard = [];

	basePlayers.forEach((player) => {
		if (selectedPlayer && player.userKey === selectedPlayer.userKey) {
			return; // Inserted below as simulated self
		}
		const evalResult = evaluatePlayerScore(player.completedKeysSet, simPosByKey, simPacks, []);
		if (evalResult.totalPoints <= 0) {
			return;
		}
		simLeaderboard.push({
			isMe: false,
			userKey: player.userKey,
			name: player.name,
			province: player.province,
			basePoints: player.baseTotalPoints,
			baseRank: player.baseRank,
			simPoints: evalResult.totalPoints,
			simBasePoints: evalResult.basePoints,
			simPackBonus: evalResult.packBonus,
		});
	});

	const meEntry = {
		isMe: true,
		userKey: selectedPlayer ? selectedPlayer.userKey : '__custom__',
		name: selectedPlayer ? selectedPlayer.name : 'Custom Player',
		province: selectedPlayer ? selectedPlayer.province : '',
		basePoints: selectedPlayer ? selectedPlayer.baseTotalPoints : 0,
		baseRank: selectedPlayer ? selectedPlayer.baseRank : null,
		simPoints: myEval.totalPoints,
		simBasePoints: myEval.basePoints,
		simPackBonus: myEval.packBonus,
	};

	const includeMeInRanking = myEval.totalPoints > 0;
	if (includeMeInRanking) {
		simLeaderboard.push(meEntry);
	}

	simLeaderboard.sort((a, b) => {
		if (Math.abs(b.simPoints - a.simPoints) > 1e-9) {
			return b.simPoints - a.simPoints;
		}
		if (b.basePoints !== a.basePoints) {
			return b.basePoints - a.basePoints;
		}
		return a.name.localeCompare(b.name);
	});

	let mySimRank = null;
	let mySimIndex = -1;
	simLeaderboard.forEach((entry, index) => {
		entry.simRank = index + 1;
		if (entry.isMe) {
			mySimRank = entry.simRank;
			mySimIndex = index;
		}
	});

	const playerAboveMe = mySimIndex > 0 ? simLeaderboard[mySimIndex - 1] : null;

	return {
		listState,
		simPacks,
		selectedPlayer,
		realRecordsMap,
		activeCompletedKeys,
		activeRecordsList,
		nonExcludedRecords,
		myEval,
		ownShiftDelta,
		simulatedHardest,
		isNewHardest,
		baselinePackKeys,
		simLeaderboard,
		meEntry,
		mySimRank,
		mySimIndex,
		playerAboveMe,
	};
}

// Custom level mutation helpers (maintain exact 1-based list slots)
function addCustomLevel(name, desiredPos) {
	const maxPos = shiftListEnabled
		? baseLevels.length + customLevels.length + 1
		: baseLevels.length + 1;
	const targetPos = Math.max(1, Math.min(maxPos, Math.round(desiredPos) || 1));

	if (shiftListEnabled) {
		customLevels.forEach((c) => {
			if (c.pos >= targetPos) {
				c.pos += 1;
			}
		});
	}

	const cleanName =
		String(name ?? '').trim() || `Unplaced Level #${nextCustomId}`;
	customLevels.push({
		id: `custom-${nextCustomId}`,
		name: cleanName,
		pos: targetPos,
	});
	nextCustomId += 1;
}

function moveCustomLevel(id, desiredPos) {
	const target = customLevels.find((c) => c.id === id);
	if (!target) return;

	const maxPos = shiftListEnabled
		? baseLevels.length + customLevels.length
		: baseLevels.length + 1;
	const newPos = Math.max(1, Math.min(maxPos, Math.round(desiredPos) || 1));
	const oldPos = target.pos;

	if (newPos === oldPos) return;

	if (shiftListEnabled) {
		customLevels.forEach((c) => {
			if (c.id !== id && c.pos > oldPos) {
				c.pos -= 1;
			}
		});
		customLevels.forEach((c) => {
			if (c.id !== id && c.pos >= newPos) {
				c.pos += 1;
			}
		});
	}

	target.pos = newPos;
}

function removeCustomLevel(id) {
	const idx = customLevels.findIndex((c) => c.id === id);
	if (idx < 0) return;
	const [removed] = customLevels.splice(idx, 1);

	if (shiftListEnabled) {
		customLevels.forEach((c) => {
			if (c.pos > removed.pos) {
				c.pos -= 1;
			}
		});
	}
}

// Rendering functions
function renderActiveProfileBar(state) {
	const player = state.selectedPlayer;

	if (player) {
		const provCode = normalizeProvince(player.province);
		if (provCode && activeProfileFlag) {
			activeProfileFlag.src = `./assets/${provCode}.png`;
			activeProfileFlag.alt = `${getProvinceName(provCode)} flag`;
			activeProfileFlag.classList.remove('hide');
		} else if (activeProfileFlag) {
			activeProfileFlag.classList.add('hide');
			activeProfileFlag.src = '';
		}
		setText(activeProfileBadge, 'Loaded Player');
		setText(activeProfileName, `${player.name} (#${player.baseRank} • ${formatPoints(player.baseTotalPoints)} pts)`);
	} else {
		if (activeProfileFlag) {
			activeProfileFlag.classList.add('hide');
			activeProfileFlag.src = '';
		}
		setText(activeProfileBadge, 'Blank Profile');
		setText(activeProfileName, 'Custom Player');
	}

	if (resetSimBtn) {
		resetSimBtn.disabled = !hasSimulationChanges();
	}
}

function renderSummaryStats(state) {
	const {
		selectedPlayer,
		myEval,
		ownShiftDelta,
		mySimRank,
		playerAboveMe,
		activeRecordsList,
		nonExcludedRecords,
		simulatedHardest,
		isNewHardest,
	} = state;

	const baselinePts = selectedPlayer ? selectedPlayer.baseTotalPoints : 0;
	const ptsDelta = myEval.totalPoints - baselinePts;

	// 1. Projected Points
	setText(statPointsValue, formatPoints(myEval.totalPoints));
	if (Math.abs(ptsDelta) > 0.004) {
		statPointsDelta.classList.remove('hide', 'positive', 'negative', 'neutral');
		statPointsDelta.classList.add(ptsDelta > 0 ? 'positive' : 'negative');
		setText(statPointsDelta, formatSigned(ptsDelta));
	} else {
		statPointsDelta.classList.add('hide');
	}

	let ptsSubStr = `Base: ${formatPoints(myEval.basePoints)} • Packs: +${formatPoints(myEval.packBonus)}`;
	if (Math.abs(ownShiftDelta) > 0.004) {
		ptsSubStr += ` • Shift: ${formatSigned(ownShiftDelta)}`;
	}
	setText(statPointsSub, ptsSubStr);

	// 2. Projected Rank
	if (mySimRank !== null) {
		setText(statRankValue, `#${mySimRank}`);

		statRankDelta.classList.remove('hide', 'positive', 'negative', 'accent', 'neutral');
		if (!selectedPlayer) {
			statRankDelta.classList.add('accent');
			setText(statRankDelta, 'NEW');
		} else {
			const rankDiff = selectedPlayer.baseRank - mySimRank;
			if (rankDiff > 0) {
				statRankDelta.classList.add('positive');
				setText(statRankDelta, `▲ ${rankDiff}`);
			} else if (rankDiff < 0) {
				statRankDelta.classList.add('negative');
				setText(statRankDelta, `▼ ${Math.abs(rankDiff)}`);
			} else {
				statRankDelta.classList.add('neutral');
				setText(statRankDelta, '—');
			}
		}

		if (mySimRank === 1) {
			setText(statRankSub, 'Top #1 on the leaderboard!');
		} else if (playerAboveMe) {
			const gap = Math.max(0, playerAboveMe.simPoints - myEval.totalPoints);
			setText(
				statRankSub,
				`${formatPoints(gap)} pts behind #${playerAboveMe.simRank} (${playerAboveMe.name})`,
			);
		} else {
			setText(statRankSub, '');
		}
	} else {
		setText(statRankValue, '-');
		statRankDelta.classList.add('hide');
		setText(statRankSub, 'Add records to place on leaderboard');
	}

	// 3. Completions
	const activeRealCount = activeRecordsList.filter((r) => r.type === 'real' && !r.excluded).length;
	const fakeCount = activeRecordsList.filter((r) => r.type === 'fake').length;
	const unplacedCount = activeRecordsList.filter((r) => r.type === 'unplaced').length;
	const totalActive = nonExcludedRecords.length;
	const baselineCount = selectedPlayer ? selectedPlayer.recordsList.length : 0;
	const compDiff = totalActive - baselineCount;

	setText(statCompletionsValue, String(totalActive));
	if (compDiff !== 0) {
		statCompletionsDelta.classList.remove('hide', 'positive', 'negative', 'neutral');
		statCompletionsDelta.classList.add(compDiff > 0 ? 'positive' : 'negative');
		setText(statCompletionsDelta, compDiff > 0 ? `+${compDiff}` : String(compDiff));
	} else {
		statCompletionsDelta.classList.add('hide');
	}

	const compParts = [`${activeRealCount} real`];
	if (fakeCount > 0) compParts.push(`+${fakeCount} list`);
	if (unplacedCount > 0) compParts.push(`+${unplacedCount} unplaced`);
	if (excludedRealKeys.size > 0) compParts.push(`-${excludedRealKeys.size} off`);
	setText(statCompletionsSub, compParts.join(' • '));

	// 4. Hardest Demon
	if (simulatedHardest) {
		setText(statHardestValue, simulatedHardest.name);
		statHardestBadge.classList.toggle('hide', !isNewHardest);
		const posLabel = Number.isFinite(simulatedHardest.simPos)
			? `#${simulatedHardest.simPos}`
			: 'Unranked';
		const typeTag = simulatedHardest.type === 'unplaced' ? ' • Unplaced FV' : '';
		setText(
			statHardestSub,
			`${posLabel} • ${formatPoints(simulatedHardest.simPts)} pts${typeTag}`,
		);
	} else {
		setText(statHardestValue, '-');
		statHardestBadge.classList.add('hide');
		setText(statHardestSub, 'No completions yet');
	}
}

function renderExistingLevelsList(state) {
	if (!existingLevelsList) return;
	existingLevelsList.innerHTML = '';

	const queryStr = normalizeKey(existingLevelSearch?.value);
	const numericQuery = queryStr.replace(/^#/, '');
	const isPosSearch = /^\d+$/.test(numericQuery);
	const hideCompleted = Boolean(hideCompletedToggle?.checked);

	// Map missing level -> total pack bonus unlocked if beaten right now
	const packUnlockBonusByKey = new Map();
	state.myEval.almostPacks.forEach(({ pack, missingNormKey }) => {
		packUnlockBonusByKey.set(
			missingNormKey,
			(packUnlockBonusByKey.get(missingNormKey) || 0) + pack.simBonusPoints,
		);
	});

	const fragment = document.createDocumentFragment();
	let renderedCount = 0;

	state.listState.orderedReal.forEach((lvl) => {
		const isRealActive =
			state.realRecordsMap.has(lvl.normKey) && !excludedRealKeys.has(lvl.normKey);
		const isFakeAdded = fakeExistingKeys.has(lvl.normKey);
		const isCompleted = isRealActive || isFakeAdded;

		if (hideCompleted && isRealActive) {
			return;
		}

		if (queryStr) {
			const matchesName = lvl.normKey.includes(queryStr);
			const matchesCreator = normalizeKey(lvl.creator).includes(queryStr);
			const matchesPos =
				isPosSearch &&
				(String(lvl.simPos) === numericQuery ||
					String(lvl.originalPos) === numericQuery);
			if (!matchesName && !matchesCreator && !matchesPos) {
				return;
			}
		}

		renderedCount += 1;

		const li = document.createElement('li');
		li.className = `existing-level-row${isFakeAdded ? ' is-added' : ''}`;

		const posDiv = document.createElement('div');
		posDiv.className = 'existing-level-pos';
		const posMain = document.createElement('span');
		setText(posMain, `#${lvl.simPos}`);
		posDiv.append(posMain);
		if (lvl.simPos !== lvl.originalPos) {
			const wasSpan = document.createElement('span');
			wasSpan.className = 'pos-shifted-note';
			setText(wasSpan, `was #${lvl.originalPos}`);
			posDiv.append(wasSpan);
		}

		const infoDiv = document.createElement('div');
		infoDiv.className = 'existing-level-info';

		const nameLine = document.createElement('div');
		nameLine.className = 'existing-level-name-line';
		const nameSpan = document.createElement('span');
		nameSpan.className = 'existing-level-name';
		setText(nameSpan, lvl.name);
		nameLine.append(nameSpan);

		if (!isCompleted && packUnlockBonusByKey.has(lvl.normKey)) {
			const bonusVal = packUnlockBonusByKey.get(lvl.normKey);
			const packHint = document.createElement('span');
			packHint.className = 'pack-hint-pill';
			setText(packHint, `+Pack (+${formatPoints(bonusVal)})`);
			nameLine.append(packHint);
		}

		const creatorSpan = document.createElement('span');
		creatorSpan.className = 'existing-level-creator';
		setText(creatorSpan, lvl.creator ? `by ${lvl.creator}` : '');

		infoDiv.append(nameLine, creatorSpan);

		const ptsSpan = document.createElement('span');
		ptsSpan.className = 'existing-level-pts';
		setText(ptsSpan, `+${formatPoints(lvl.points)}`);

		const actionBtn = document.createElement('button');
		actionBtn.type = 'button';

		if (isRealActive) {
			actionBtn.className = 'level-action-btn beaten';
			actionBtn.disabled = true;
			actionBtn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Beaten';
		} else if (isFakeAdded) {
			actionBtn.className = 'level-action-btn added';
			actionBtn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Added';
			actionBtn.title = 'Click to remove simulated record';
			actionBtn.addEventListener('click', () => {
				fakeExistingKeys.delete(lvl.normKey);
				recalculateAndRender();
			});
		} else {
			actionBtn.className = 'level-action-btn add';
			actionBtn.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i> Add';
			actionBtn.addEventListener('click', () => {
				if (excludedRealKeys.has(lvl.normKey)) {
					excludedRealKeys.delete(lvl.normKey);
				} else {
					fakeExistingKeys.add(lvl.normKey);
				}
				recalculateAndRender();
			});
		}

		li.append(posDiv, infoDiv, ptsSpan, actionBtn);
		fragment.append(li);
	});

	if (renderedCount === 0) {
		const empty = document.createElement('li');
		empty.className = 'empty-state-msg';
		setText(
			empty,
			baseLevels.length === 0
				? 'Loading levels...'
				: 'No matching levels found.',
		);
		fragment.append(empty);
	}

	existingLevelsList.append(fragment);
}

function populateUnplacedAnchorSelect(state) {
	if (!unplacedAnchorSelect) return;
	const combined = state.listState.combinedList;
	const maxAddPos = shiftListEnabled
		? baseLevels.length + customLevels.length + 1
		: baseLevels.length + 1;

	unplacedAnchorSelect.innerHTML = '';

	const placeholderOpt = document.createElement('option');
	placeholderOpt.value = '';
	setText(placeholderOpt, '— Select a level to place directly above —');
	unplacedAnchorSelect.append(placeholderOpt);

	combined.forEach((lvl) => {
		const opt = document.createElement('option');
		opt.value = String(lvl.simPos);
		const customTag = lvl.isCustom ? ' [Unplaced]' : '';
		setText(opt, `Above #${lvl.simPos} – ${lvl.name}${customTag}`);
		unplacedAnchorSelect.append(opt);
	});

	const bottomOpt = document.createElement('option');
	bottomOpt.value = String(maxAddPos);
	setText(bottomOpt, `Bottom of list (#${maxAddPos})`);
	unplacedAnchorSelect.append(bottomOpt);

	if (unplacedPosInput) {
		unplacedPosInput.max = String(maxAddPos);
		const currentVal = parseInt(unplacedPosInput.value, 10);
		if (!Number.isFinite(currentVal) || currentVal < 1) {
			unplacedPosInput.value = '1';
		} else if (currentVal > maxAddPos) {
			unplacedPosInput.value = String(maxAddPos);
		}
		syncAnchorSelectWithPos();
	}
}

function syncAnchorSelectWithPos() {
	if (!unplacedAnchorSelect || !unplacedPosInput) return;
	const posStr = String(parseInt(unplacedPosInput.value, 10) || '');
	const hasMatch = Array.from(unplacedAnchorSelect.options).some(
		(opt) => opt.value === posStr,
	);
	unplacedAnchorSelect.value = hasMatch ? posStr : '';
}

function updateUnplacedPreview() {
	if (!lastRenderedState || !unplacedPosInput) return;

	const maxAddPos = shiftListEnabled
		? baseLevels.length + customLevels.length + 1
		: baseLevels.length + 1;
	const rawPos = parseInt(unplacedPosInput.value, 10);
	const pos = Number.isFinite(rawPos)
		? Math.max(1, Math.min(maxAddPos, rawPos))
		: 1;

	const combined = lastRenderedState.listState.combinedList;

	let neighborText = `#${pos}`;
	if (combined.length === 0) {
		neighborText = `Position #${pos}`;
	} else if (pos === 1) {
		neighborText = `New #1 — above #1 ${combined[0].name}`;
	} else if (pos > combined.length) {
		const last = combined[combined.length - 1];
		neighborText = `Bottom of list (#${pos}) — below #${last.simPos} ${last.name}`;
	} else {
		const above = combined[pos - 2];
		const below = combined[pos - 1];
		neighborText = `Between #${above.simPos} ${above.name} and #${below.simPos} ${below.name}`;
	}
	setText(unplacedPreviewNeighbors, neighborText);

	const levelPts = calculatePoints(pos);
	setText(unplacedPreviewLevelPts, `Level: +${formatPoints(levelPts)} pts`);

	// Compute dry-run net points impact including realistic list shift
	const tempCustoms = customLevels.map((c) => ({ ...c }));
	if (shiftListEnabled) {
		tempCustoms.forEach((c) => {
			if (c.pos >= pos) c.pos += 1;
		});
	}
	tempCustoms.push({
		id: '__preview__',
		name: '__preview__',
		pos,
	});

	const previewSim = computeFullSimulation(tempCustoms, shiftListEnabled);
	const netGain =
		previewSim.myEval.totalPoints - lastRenderedState.myEval.totalPoints;
	const shiftLoss = netGain - levelPts;

	unplacedPreviewNetPts.classList.remove('positive', 'negative', 'neutral');
	if (netGain > 0.004) {
		unplacedPreviewNetPts.classList.add('positive');
	} else if (netGain < -0.004) {
		unplacedPreviewNetPts.classList.add('negative');
	} else {
		unplacedPreviewNetPts.classList.add('neutral');
	}

	if (shiftListEnabled && Math.abs(shiftLoss) > 0.004) {
		setText(
			unplacedPreviewNetPts,
			`Net gain: ${formatSigned(netGain)} pts (shift: ${formatSigned(shiftLoss)})`,
		);
	} else {
		setText(unplacedPreviewNetPts, `Net gain: ${formatSigned(netGain)} pts`);
	}
}

function renderRecordsList(state) {
	if (!recordsList) return;
	recordsList.innerHTML = '';

	const totalActive = state.nonExcludedRecords.length;
	setText(recordsCountPill, String(totalActive));

	// Shift notice banner
	if (customLevels.length > 0 && shiftListEnabled) {
		shiftNoticeBanner.classList.remove('hide');
		shiftNoticeBanner.innerHTML = `<i class="fa-solid fa-arrows-down-to-line" aria-hidden="true"></i> <span>${customLevels.length} unplaced ${customLevels.length === 1 ? 'level is' : 'levels are'} shifting existing list positions down for you and all leaderboard players.</span>`;
	} else if (customLevels.length > 0 && !shiftListEnabled) {
		shiftNoticeBanner.classList.remove('hide');
		shiftNoticeBanner.innerHTML = `<i class="fa-solid fa-circle-info" aria-hidden="true"></i> <span>List shifting is turned off — unplaced levels are scored without shifting existing levels.</span>`;
	} else {
		shiftNoticeBanner.classList.add('hide');
	}

	const filtered = state.activeRecordsList.filter((rec) => {
		if (activeRecordFilter === 'simulated') {
			return rec.type === 'fake' || rec.type === 'unplaced';
		}
		if (activeRecordFilter === 'real') {
			return rec.type === 'real';
		}
		return true;
	});

	if (filtered.length === 0) {
		const empty = document.createElement('li');
		empty.className = 'empty-state-msg';
		if (activeRecordFilter === 'simulated') {
			setText(
				empty,
				'No simulated records yet. Add an existing list level or an unplaced level above!',
			);
		} else if (activeRecordFilter === 'real') {
			setText(empty, 'No loaded real records. Pick a player above to load their completions.');
		} else {
			setText(
				empty,
				'No records yet. Load a player or add simulated completions above to calculate your rank!',
			);
		}
		recordsList.append(empty);
		return;
	}

	const maxCustomPos = shiftListEnabled
		? baseLevels.length + customLevels.length
		: baseLevels.length + 1;

	const fragment = document.createDocumentFragment();

	filtered.forEach((rec) => {
		const li = document.createElement('li');
		li.className = `sim-record-item type-${rec.type}${rec.excluded ? ' is-excluded' : ''}`;

		// Position column (inline editable for unplaced levels!)
		if (rec.type === 'unplaced') {
			const editor = document.createElement('div');
			editor.className = 'unplaced-pos-editor';

			const upBtn = document.createElement('button');
			upBtn.type = 'button';
			upBtn.className = 'pos-step-btn';
			upBtn.title = 'Move up (harder)';
			upBtn.ariaLabel = 'Move placement up';
			upBtn.disabled = rec.simPos <= 1;
			upBtn.innerHTML = '<i class="fa-solid fa-chevron-up" aria-hidden="true"></i>';
			upBtn.addEventListener('click', () => {
				moveCustomLevel(rec.id, rec.simPos - 1);
				recalculateAndRender();
			});

			const posInput = document.createElement('input');
			posInput.type = 'number';
			posInput.className = 'pos-inline-input';
			posInput.min = '1';
			posInput.max = String(maxCustomPos);
			posInput.value = String(rec.simPos);
			posInput.ariaLabel = `Placement for ${rec.name}`;
			posInput.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					posInput.blur();
				}
			});
			posInput.addEventListener('change', () => {
				const parsed = parseInt(posInput.value, 10);
				if (Number.isFinite(parsed)) {
					moveCustomLevel(rec.id, parsed);
					recalculateAndRender();
				} else {
					posInput.value = String(rec.simPos);
				}
			});

			const downBtn = document.createElement('button');
			downBtn.type = 'button';
			downBtn.className = 'pos-step-btn';
			downBtn.title = 'Move down (easier)';
			downBtn.ariaLabel = 'Move placement down';
			downBtn.disabled = rec.simPos >= maxCustomPos;
			downBtn.innerHTML = '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
			downBtn.addEventListener('click', () => {
				moveCustomLevel(rec.id, rec.simPos + 1);
				recalculateAndRender();
			});

			editor.append(upBtn, posInput, downBtn);
			li.append(editor);
		} else {
			const posBox = document.createElement('div');
			posBox.className = 'record-pos-box';

			const posMain = document.createElement('span');
			posMain.className = 'record-pos-main';
			setText(posMain, Number.isFinite(rec.simPos) ? `#${rec.simPos}` : '—');
			posBox.append(posMain);

			if (
				Number.isFinite(rec.originalPos) &&
				Number.isFinite(rec.simPos) &&
				rec.simPos !== rec.originalPos
			) {
				const shiftNote = document.createElement('span');
				shiftNote.className = 'record-pos-shift';
				setText(shiftNote, `was #${rec.originalPos}`);
				posBox.append(shiftNote);
			}

			li.append(posBox);
		}

		// Main title & tags
		const infoDiv = document.createElement('div');
		infoDiv.className = 'record-main-info';

		const titleRow = document.createElement('div');
		titleRow.className = 'record-title-row';

		const nameSpan = document.createElement('span');
		nameSpan.className = `record-name${rec.first ? ' is-fv' : ''}`;
		setText(nameSpan, rec.name);
		titleRow.append(nameSpan);

		if (rec.type === 'fake') {
			const tag = document.createElement('span');
			tag.className = 'record-tag tag-sim';
			setText(tag, 'Simulated');
			titleRow.append(tag);
		} else if (rec.type === 'unplaced') {
			const tag = document.createElement('span');
			tag.className = 'record-tag tag-unplaced';
			setText(tag, 'Unplaced');
			titleRow.append(tag);
		}

		if (rec.first) {
			const fvTag = document.createElement('span');
			fvTag.className = 'record-tag tag-fv';
			setText(fvTag, 'FV');
			titleRow.append(fvTag);
		}

		if (rec.excluded) {
			const exTag = document.createElement('span');
			exTag.className = 'record-tag tag-excluded';
			setText(exTag, 'Excluded');
			titleRow.append(exTag);
		}

		infoDiv.append(titleRow);
		li.append(infoDiv);

		// Points column
		const ptsCol = document.createElement('div');
		ptsCol.className = 'record-pts-col';

		const ptsVal = document.createElement('span');
		ptsVal.className = 'record-pts-val';
		setText(ptsVal, rec.excluded ? '0.00' : formatPoints(rec.simPts));
		ptsCol.append(ptsVal);

		if (
			rec.type === 'real' &&
			!rec.excluded &&
			Math.abs(rec.simPts - rec.originalPts) > 0.004
		) {
			const ptsDiff = document.createElement('span');
			ptsDiff.className = 'record-pts-diff';
			setText(ptsDiff, formatSigned(rec.simPts - rec.originalPts));
			ptsCol.append(ptsDiff);
		}

		li.append(ptsCol);

		// Action button
		const actionBtn = document.createElement('button');
		actionBtn.type = 'button';

		if (rec.type === 'fake') {
			actionBtn.className = 'record-icon-btn remove';
			actionBtn.title = 'Remove simulated record';
			actionBtn.ariaLabel = `Remove ${rec.name}`;
			actionBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
			actionBtn.addEventListener('click', () => {
				fakeExistingKeys.delete(rec.normKey);
				recalculateAndRender();
			});
		} else if (rec.type === 'unplaced') {
			actionBtn.className = 'record-icon-btn remove';
			actionBtn.title = 'Remove unplaced level';
			actionBtn.ariaLabel = `Remove ${rec.name}`;
			actionBtn.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
			actionBtn.addEventListener('click', () => {
				removeCustomLevel(rec.id);
				recalculateAndRender();
			});
		} else if (rec.excluded) {
			actionBtn.className = 'record-icon-btn restore';
			actionBtn.title = 'Restore real record';
			actionBtn.ariaLabel = `Restore ${rec.name}`;
			actionBtn.innerHTML = '<i class="fa-solid fa-rotate-left" aria-hidden="true"></i>';
			actionBtn.addEventListener('click', () => {
				excludedRealKeys.delete(rec.normKey);
				recalculateAndRender();
			});
		} else {
			actionBtn.className = 'record-icon-btn remove';
			actionBtn.title = 'Temporarily exclude this real record from simulation';
			actionBtn.ariaLabel = `Exclude ${rec.name}`;
			actionBtn.innerHTML = '<i class="fa-solid fa-eye-slash" aria-hidden="true"></i>';
			actionBtn.addEventListener('click', () => {
				excludedRealKeys.add(rec.normKey);
				recalculateAndRender();
			});
		}

		li.append(actionBtn);
		fragment.append(li);
	});

	recordsList.append(fragment);
}

function renderPacksImpact(state) {
	if (!calcCompletedPacks || !calcPacksTotal) return;

	const { completedPacks, almostPacks, packBonus } = state.myEval;
	setText(calcPacksTotal, `+${formatPoints(packBonus)} pts`);

	calcCompletedPacks.innerHTML = '';
	if (completedPacks.length === 0) {
		const msg = document.createElement('span');
		msg.className = 'empty-state-msg';
		msg.style.padding = '4px 0';
		setText(msg, 'No completed level packs yet.');
		calcCompletedPacks.append(msg);
	} else {
		completedPacks.forEach((pack) => {
			const isNewlyUnlocked = !state.baselinePackKeys.has(pack.key);
			const pill = document.createElement('div');
			pill.className = `calc-pack-pill${isNewlyUnlocked ? ' newly-unlocked' : ''}`;
			pill.style.borderColor = pack.color || '#e2495c';

			const nameSpan = document.createElement('span');
			setText(nameSpan, pack.name);
			pill.append(nameSpan);

			const ptsSpan = document.createElement('span');
			ptsSpan.className = 'calc-pack-pts';
			setText(ptsSpan, `+${formatPoints(pack.simBonusPoints)}`);
			pill.append(ptsSpan);

			if (isNewlyUnlocked) {
				const newTag = document.createElement('span');
				newTag.className = 'calc-pack-new-tag';
				setText(newTag, 'NEW');
				pill.append(newTag);
			}

			calcCompletedPacks.append(pill);
		});
	}

	// "1 Level Away" packs (up to 4)
	if (calcAlmostPacksWrap && calcAlmostPacks) {
		calcAlmostPacks.innerHTML = '';
		const validAlmost = almostPacks
			.filter((entry) => baseLevelByKey.has(entry.missingNormKey))
			.slice(0, 4);

		if (validAlmost.length === 0) {
			calcAlmostPacksWrap.classList.add('hide');
		} else {
			calcAlmostPacksWrap.classList.remove('hide');
			validAlmost.forEach(({ pack, missingLevelName, missingNormKey }) => {
				const row = document.createElement('div');
				row.className = 'almost-pack-row';
				row.style.borderLeftColor = pack.color || '#e2495c';

				const text = document.createElement('span');
				text.className = 'almost-pack-text';
				const packStrong = document.createElement('strong');
				setText(packStrong, pack.name);
				text.append(
					packStrong,
					document.createTextNode(
						` (+${formatPoints(pack.simBonusPoints)} bonus) — missing `,
					),
				);
				const missingStrong = document.createElement('strong');
				setText(missingStrong, missingLevelName);
				text.append(missingStrong);

				const addBtn = document.createElement('button');
				addBtn.type = 'button';
				addBtn.className = 'almost-pack-add-btn';
				addBtn.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i> ';
				addBtn.append(document.createTextNode(`Add ${missingLevelName}`));
				addBtn.addEventListener('click', () => {
					if (excludedRealKeys.has(missingNormKey)) {
						excludedRealKeys.delete(missingNormKey);
					} else {
						fakeExistingKeys.add(missingNormKey);
					}
					recalculateAndRender();
				});

				row.append(text, addBtn);
				calcAlmostPacks.append(row);
			});
		}
	}
}

function renderProjectedLeaderboard(state, shouldAutoScroll = false) {
	if (!simLeaderboardList) return;
	simLeaderboardList.innerHTML = '';

	if (lbShiftNote) {
		if (customLevels.length > 0 && shiftListEnabled) {
			lbShiftNote.classList.remove('hide');
			setText(
				lbShiftNote,
				`All players recalculated with +${customLevels.length} unplaced ${customLevels.length === 1 ? 'level' : 'levels'} shifting the list.`,
			);
		} else {
			lbShiftNote.classList.add('hide');
		}
	}

	const searchStr = normalizeKey(lbSearchInput?.value);
	const myIdx = state.mySimIndex;
	const myPts = state.myEval.totalPoints;

	let rowsToRender = state.simLeaderboard;

	if (lbViewMode === 'nearby' && myIdx >= 0 && !searchStr) {
		const start = Math.max(0, myIdx - 8);
		const end = Math.min(state.simLeaderboard.length, myIdx + 9);
		rowsToRender = state.simLeaderboard.slice(start, end);
	} else if (searchStr) {
		rowsToRender = state.simLeaderboard.filter(
			(entry) =>
				entry.isMe ||
				normalizeKey(entry.name).includes(searchStr) ||
				String(entry.simRank) === searchStr.replace(/^#/, ''),
		);
	}

	if (rowsToRender.length === 0) {
		const empty = document.createElement('li');
		empty.className = 'empty-state-msg';
		setText(empty, 'No matching players on the leaderboard.');
		simLeaderboardList.append(empty);
		return;
	}

	const fragment = document.createDocumentFragment();
	let meRowEl = null;

	rowsToRender.forEach((entry, idx) => {
		const li = document.createElement('li');
		li.className = `sim-lb-row${idx % 2 === 1 ? ' alt-row' : ''}${entry.isMe ? ' is-me' : ''}`;

		if (entry.isMe) {
			meRowEl = li;
		}

		// Rank + movement
		const rankCol = document.createElement('div');
		rankCol.className = 'lb-rank-col';

		const rankNum = document.createElement('span');
		rankNum.className = 'lb-rank-num';
		setText(rankNum, `#${entry.simRank}`);
		rankCol.append(rankNum);

		if (entry.isMe && entry.baseRank === null) {
			const moveSpan = document.createElement('span');
			moveSpan.className = 'lb-rank-move new';
			setText(moveSpan, 'NEW');
			rankCol.append(moveSpan);
		} else if (entry.baseRank !== null && entry.baseRank !== entry.simRank) {
			const diff = entry.baseRank - entry.simRank;
			const moveSpan = document.createElement('span');
			moveSpan.className = `lb-rank-move ${diff > 0 ? 'up' : 'down'}`;
			setText(moveSpan, diff > 0 ? `▲${diff}` : `▼${Math.abs(diff)}`);
			rankCol.append(moveSpan);
		}

		// Province flag
		const provCode = normalizeProvince(entry.province);
		let flagEl;
		if (provCode) {
			flagEl = document.createElement('img');
			flagEl.className = 'lb-flag';
			flagEl.src = `./assets/${provCode}.png`;
			flagEl.alt = `${getProvinceName(provCode)} flag`;
			flagEl.loading = 'lazy';
		} else {
			flagEl = document.createElement('span');
			flagEl.className = 'lb-flag-spacer';
		}

		// Name + points
		const infoDiv = document.createElement('div');
		infoDiv.className = 'lb-player-info';

		const nameLine = document.createElement('div');
		nameLine.className = 'lb-player-name-line';

		const nameSpan = document.createElement('span');
		nameSpan.className = 'lb-player-name';
		setText(nameSpan, entry.name);
		nameLine.append(nameSpan);

		if (entry.isMe) {
			const youPill = document.createElement('span');
			youPill.className = 'you-pill';
			setText(youPill, 'YOU');
			nameLine.append(youPill);
		}

		const ptsSpan = document.createElement('span');
		ptsSpan.className = 'lb-player-pts';
		setText(ptsSpan, `${formatPoints(entry.simPoints)} pts`);

		infoDiv.append(nameLine, ptsSpan);

		// Right col: gap vs simulated player + load button for others
		const rightCol = document.createElement('div');
		rightCol.className = 'lb-right-col';

		if (!entry.isMe && myPts > 0) {
			const gap = entry.simPoints - myPts;
			const gapSpan = document.createElement('span');
			gapSpan.className = `lb-gap-text ${gap >= 0 ? 'ahead' : 'behind'}`;
			setText(gapSpan, formatSigned(gap));
			rightCol.append(gapSpan);
		}

		if (!entry.isMe) {
			const loadBtn = document.createElement('button');
			loadBtn.type = 'button';
			loadBtn.className = 'lb-load-btn';
			loadBtn.title = `Load ${entry.name}'s records`;
			loadBtn.ariaLabel = `Load ${entry.name}`;
			loadBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket" aria-hidden="true"></i>';
			loadBtn.addEventListener('click', () => {
				loadPlayerProfile(entry.userKey);
			});
			rightCol.append(loadBtn);
		}

		li.append(rankCol, flagEl, infoDiv, rightCol);
		fragment.append(li);
	});

	simLeaderboardList.append(fragment);

	if (jumpToMeBtn) {
		jumpToMeBtn.disabled = !meRowEl;
	}

	if (shouldAutoScroll && meRowEl) {
		scrollLeaderboardToElement(meRowEl);
	}
}

function scrollLeaderboardToElement(rowEl, smooth = false) {
	if (!simLeaderboardList || !rowEl) return;
	// Use previous non-sticky sibling so sticky positioning on .is-me never skews offsetTop.
	const prev = rowEl.previousElementSibling;
	const naturalTop = prev ? prev.offsetTop + prev.offsetHeight : 0;
	const targetTop =
		naturalTop -
		simLeaderboardList.clientHeight / 2 +
		rowEl.offsetHeight / 2;
	simLeaderboardList.scrollTo({
		top: Math.max(0, targetTop),
		behavior: smooth ? 'smooth' : 'auto',
	});
}

function recalculateAndRender({ forceScroll = false } = {}) {
	const state = computeFullSimulation();
	lastRenderedState = state;

	const rankChanged =
		state.mySimRank !== null && state.mySimRank !== lastScrolledRank;
	const shouldScroll = forceScroll || rankChanged;
	lastScrolledRank = state.mySimRank;

	renderActiveProfileBar(state);
	renderSummaryStats(state);
	renderExistingLevelsList(state);
	populateUnplacedAnchorSelect(state);
	updateUnplacedPreview();
	renderRecordsList(state);
	renderPacksImpact(state);
	renderProjectedLeaderboard(state, shouldScroll);
}

// Player Picker Dropdown
function renderPlayerPickerDropdown() {
	if (!playerPickerDropdown) return;
	playerPickerDropdown.innerHTML = '';

	const queryStr = normalizeKey(playerPickerInput?.value);
	const matches = basePlayers.filter((p) =>
		!queryStr || normalizeKey(p.name).includes(queryStr),
	);

	if (matches.length === 0) {
		const empty = document.createElement('li');
		empty.className = 'picker-empty';
		setText(empty, isDataLoaded ? 'No players match your search.' : 'Loading players...');
		playerPickerDropdown.append(empty);
		return;
	}

	const fragment = document.createDocumentFragment();
	matches.slice(0, 60).forEach((player, idx) => {
		const li = document.createElement('li');
		li.className = `picker-option${idx === pickerHighlightIndex ? ' active' : ''}`;
		li.role = 'option';
		li.dataset.userKey = player.userKey;

		const provCode = normalizeProvince(player.province);
		if (provCode) {
			const img = document.createElement('img');
			img.className = 'picker-option-flag';
			img.src = `./assets/${provCode}.png`;
			img.alt = '';
			li.append(img);
		} else {
			const spacer = document.createElement('span');
			spacer.className = 'picker-option-flag-placeholder';
			li.append(spacer);
		}

		const rankSpan = document.createElement('span');
		rankSpan.className = 'picker-option-rank';
		setText(rankSpan, `#${player.baseRank}`);

		const nameSpan = document.createElement('span');
		nameSpan.className = 'picker-option-name';
		setText(nameSpan, player.name);

		const ptsSpan = document.createElement('span');
		ptsSpan.className = 'picker-option-pts';
		setText(ptsSpan, formatPoints(player.baseTotalPoints));

		li.append(rankSpan, nameSpan, ptsSpan);

		li.addEventListener('mousedown', (e) => {
			e.preventDefault();
			loadPlayerProfile(player.userKey);
			closePlayerPicker();
		});

		fragment.append(li);
	});

	playerPickerDropdown.append(fragment);
}

function openPlayerPicker() {
	pickerOpen = true;
	pickerHighlightIndex = -1;
	renderPlayerPickerDropdown();
	playerPickerDropdown?.classList.remove('hide');
	playerPickerInput?.setAttribute('aria-expanded', 'true');
}

function closePlayerPicker() {
	pickerOpen = false;
	pickerHighlightIndex = -1;
	playerPickerDropdown?.classList.add('hide');
	playerPickerInput?.setAttribute('aria-expanded', 'false');
}

function loadPlayerProfile(userKey, { keepSimulation = false } = {}) {
	const player = basePlayerByUserKey.get(userKey);
	if (!player) return;

	selectedUserKey = player.userKey;
	if (!keepSimulation) {
		excludedRealKeys.clear();
		fakeExistingKeys.clear();
		customLevels = [];
	} else {
		// Clean up any fake levels that this player already beat for real
		player.completedKeysSet.forEach((key) => fakeExistingKeys.delete(key));
		excludedRealKeys.clear();
	}

	if (playerPickerInput) {
		playerPickerInput.value = player.name;
	}
	playerPickerClear?.classList.remove('hide');
	lastScrolledRank = null;
	recalculateAndRender({ forceScroll: true });
}

function startBlankProfile() {
	selectedUserKey = null;
	excludedRealKeys.clear();
	fakeExistingKeys.clear();
	customLevels = [];
	if (playerPickerInput) {
		playerPickerInput.value = '';
	}
	playerPickerClear?.classList.add('hide');
	lastScrolledRank = null;
	recalculateAndRender();
}

function resetSimulation() {
	excludedRealKeys.clear();
	fakeExistingKeys.clear();
	customLevels = [];
	lastScrolledRank = null;
	recalculateAndRender({ forceScroll: true });
}

function switchAddTab(tabName) {
	activeAddTab = tabName;
	const isExisting = tabName === 'existing';

	tabExisting?.classList.toggle('active', isExisting);
	tabExisting?.setAttribute('aria-selected', String(isExisting));
	tabUnplaced?.classList.toggle('active', !isExisting);
	tabUnplaced?.setAttribute('aria-selected', String(!isExisting));

	panelExisting?.classList.toggle('hide', !isExisting);
	panelUnplaced?.classList.toggle('hide', isExisting);

	if (!isExisting) {
		updateUnplacedPreview();
	}
}

// Event wiring
playerPickerInput?.addEventListener('focus', () => {
	openPlayerPicker();
});

playerPickerInput?.addEventListener('input', () => {
	playerPickerClear?.classList.toggle('hide', !playerPickerInput.value);
	openPlayerPicker();
});

playerPickerInput?.addEventListener('keydown', (e) => {
	if (!pickerOpen) {
		if (e.key === 'ArrowDown') {
			openPlayerPicker();
		}
		return;
	}

	const options = playerPickerDropdown?.querySelectorAll('.picker-option');
	if (!options || !options.length) return;

	if (e.key === 'ArrowDown') {
		e.preventDefault();
		pickerHighlightIndex = (pickerHighlightIndex + 1) % options.length;
		renderPlayerPickerDropdown();
		playerPickerDropdown
			?.querySelectorAll('.picker-option')
			[pickerHighlightIndex]?.scrollIntoView({ block: 'nearest' });
	} else if (e.key === 'ArrowUp') {
		e.preventDefault();
		pickerHighlightIndex =
			pickerHighlightIndex <= 0 ? options.length - 1 : pickerHighlightIndex - 1;
		renderPlayerPickerDropdown();
		playerPickerDropdown
			?.querySelectorAll('.picker-option')
			[pickerHighlightIndex]?.scrollIntoView({ block: 'nearest' });
	} else if (e.key === 'Enter') {
		e.preventDefault();
		const idx = pickerHighlightIndex >= 0 ? pickerHighlightIndex : 0;
		const key = options[idx]?.dataset.userKey;
		if (key) {
			loadPlayerProfile(key);
			closePlayerPicker();
			playerPickerInput.blur();
		}
	} else if (e.key === 'Escape') {
		closePlayerPicker();
	}
});

playerPickerClear?.addEventListener('click', () => {
	if (playerPickerInput) {
		playerPickerInput.value = '';
		playerPickerInput.focus();
	}
	playerPickerClear.classList.add('hide');
	openPlayerPicker();
});

document.addEventListener('click', (e) => {
	if (
		pickerOpen &&
		!e.target.closest('.player-picker-wrap')
	) {
		closePlayerPicker();
	}
});

startBlankBtn?.addEventListener('click', startBlankProfile);
resetSimBtn?.addEventListener('click', resetSimulation);

tabExisting?.addEventListener('click', () => switchAddTab('existing'));
tabUnplaced?.addEventListener('click', () => switchAddTab('unplaced'));

existingLevelSearch?.addEventListener('input', () => {
	if (lastRenderedState) renderExistingLevelsList(lastRenderedState);
});

hideCompletedToggle?.addEventListener('change', () => {
	if (lastRenderedState) renderExistingLevelsList(lastRenderedState);
});

unplacedPosInput?.addEventListener('input', () => {
	syncAnchorSelectWithPos();
	updateUnplacedPreview();
});

unplacedAnchorSelect?.addEventListener('change', () => {
	if (unplacedAnchorSelect.value && unplacedPosInput) {
		unplacedPosInput.value = unplacedAnchorSelect.value;
		updateUnplacedPreview();
	}
});

shiftListToggle?.addEventListener('change', () => {
	shiftListEnabled = Boolean(shiftListToggle.checked);
	if (shiftListEnabled && customLevels.length > 0) {
		const resolved = buildSimulatedList(customLevels, true);
		customLevels.forEach((c) => {
			const slotPos = resolved.customPosById.get(c.id);
			if (Number.isFinite(slotPos)) {
				c.pos = slotPos;
			}
		});
	}
	recalculateAndRender();
});

unplacedForm?.addEventListener('submit', (e) => {
	e.preventDefault();
	const name = unplacedNameInput?.value.trim() || '';
	const pos = parseInt(unplacedPosInput?.value, 10) || 1;
	addCustomLevel(name, pos);
	if (unplacedNameInput) {
		unplacedNameInput.value = '';
	}
	recalculateAndRender();
});

recordFilterBtns.forEach((btn) => {
	btn.addEventListener('click', () => {
		activeRecordFilter = btn.dataset.filter || 'all';
		recordFilterBtns.forEach((b) =>
			b.classList.toggle('active', b === btn),
		);
		if (lastRenderedState) renderRecordsList(lastRenderedState);
	});
});

lbSearchInput?.addEventListener('input', () => {
	if (lastRenderedState) renderProjectedLeaderboard(lastRenderedState, false);
});

lbViewAllBtn?.addEventListener('click', () => {
	lbViewMode = 'all';
	lbViewAllBtn.classList.add('active');
	lbViewNearbyBtn?.classList.remove('active');
	if (lastRenderedState) renderProjectedLeaderboard(lastRenderedState, false);
});

lbViewNearbyBtn?.addEventListener('click', () => {
	lbViewMode = 'nearby';
	lbViewNearbyBtn.classList.add('active');
	lbViewAllBtn?.classList.remove('active');
	if (lastRenderedState) renderProjectedLeaderboard(lastRenderedState, true);
});

jumpToMeBtn?.addEventListener('click', () => {
	const meRow = simLeaderboardList?.querySelector('.sim-lb-row.is-me');
	if (meRow) {
		scrollLeaderboardToElement(meRow, true);
	}
});

// Load Firebase data (uses meta/lastUpdated versioned cache to save bandwidth)
async function loadCalculatorData() {
	try {
		const { users, levels, packs, tiers } = await getLeaderboardBundleCached();

		const tiersMap = new Map();
		tiers.forEach((tier) => {
			if (tier?.name) {
				tiersMap.set(tier.key, tier);
			}
		});

		baseLevels = [];
		baseLevelByKey.clear();
		baseLevelPosByKey.clear();

		levels.forEach((lvl) => {
			if (!lvl?.name || typeof lvl.pos !== 'number') return;
			const normKey = normalizeKey(lvl.name);
			const entry = {
				key: lvl.key,
				name: lvl.name,
				creator: lvl.creator || '',
				video: lvl.video || '',
				pos: lvl.pos,
				normKey,
			};
			baseLevels.push(entry);
			baseLevelByKey.set(normKey, entry);
			baseLevelPosByKey.set(normKey, lvl.pos);
		});

		baseLevels.sort((a, b) => a.pos - b.pos);

		allPacks = [];
		packs.forEach((pack) => {
			if (pack?.name && Array.isArray(pack.levels)) {
				const assignedTier = pack.tierId ? tiersMap.get(pack.tierId) : null;
				const baseSum = pack.levels.reduce((sum, lvlName) => {
					const pos = baseLevelPosByKey.get(normalizeKey(lvlName)) ?? Infinity;
					return sum + calculatePoints(pos);
				}, 0);
				allPacks.push({
					...pack,
					color: assignedTier ? assignedTier.color : pack.color || '#e2495c',
					tierName: assignedTier ? assignedTier.name : null,
					tierPos:
						assignedTier && typeof assignedTier.pos === 'number'
							? assignedTier.pos
							: Infinity,
					baseBonusPoints: calculatePackBonusPoints(pack, baseSum),
				});
			}
		});

		allPacks.sort((a, b) => {
			if (a.tierPos !== b.tierPos) return a.tierPos - b.tierPos;
			const posA = typeof a.pos === 'number' ? a.pos : 9999;
			const posB = typeof b.pos === 'number' ? b.pos : 9999;
			return posA - posB;
		});

		basePlayers = [];
		basePlayerByUserKey.clear();

		users.forEach((player) => {
			const recordsList = Object.values(player?.records ?? {});
			if (!player?.name || !recordsList.length) return;

			const completedKeysSet = new Set(
				recordsList.map((r) => normalizeKey(r.name)),
			);

			const hardest = recordsList.reduce((curr, rec) => {
				const recPos = baseLevelPosByKey.get(normalizeKey(rec.name)) ?? Infinity;
				const currPos = baseLevelPosByKey.get(normalizeKey(curr.name)) ?? Infinity;
				return recPos < currPos ? rec : curr;
			}, recordsList[0]);

			const baseLevelPoints = recordsList.reduce((sum, rec) => {
				const pos = baseLevelPosByKey.get(normalizeKey(rec.name)) ?? Infinity;
				return sum + calculatePoints(pos);
			}, 0);

			let basePackBonus = 0;
			const baseCompletedPacks = [];
			allPacks.forEach((pack) => {
				if (
					pack.levels.length > 0 &&
					pack.levels.every((lvlName) =>
						completedKeysSet.has(normalizeKey(lvlName)),
					)
				) {
					basePackBonus += pack.baseBonusPoints || 0;
					baseCompletedPacks.push(pack);
				}
			});

			const baseTotalPoints = baseLevelPoints + basePackBonus;
			if (baseTotalPoints <= 0) return;

			const playerObj = {
				userKey: player.key,
				name: player.name,
				province: player.province || '',
				recordsList,
				completedKeysSet,
				hardest,
				baseLevelPoints,
				basePackBonus,
				baseCompletedPacks,
				baseTotalPoints,
				baseRank: 0,
			};

			basePlayers.push(playerObj);
			basePlayerByUserKey.set(player.key, playerObj);
		});

		basePlayers.sort((a, b) => b.baseTotalPoints - a.baseTotalPoints);
		basePlayers.forEach((p, idx) => {
			p.baseRank = idx + 1;
		});

		isDataLoaded = true;
		if (calcLoadingStatus) {
			calcLoadingStatus.classList.add('hide');
		}

		// Optional ?player=<name> deep link
		const params = new URLSearchParams(window.location.search);
		const requestedPlayer = normalizeKey(params.get('player'));
		if (requestedPlayer) {
			const match = basePlayers.find(
				(p) => normalizeKey(p.name) === requestedPlayer,
			);
			if (match) {
				loadPlayerProfile(match.userKey);
				return;
			}
		}

		recalculateAndRender();
	} catch (error) {
		console.error('Failed to load calculator data.', error);
		if (calcLoadingStatus) {
			calcLoadingStatus.classList.add('error');
			calcLoadingStatus.innerHTML =
				'<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> <span>Failed to load list data</span>';
		}
	}
}

loadCalculatorData();
