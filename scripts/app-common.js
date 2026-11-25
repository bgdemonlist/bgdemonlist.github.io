import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
	getAuth,
	onAuthStateChanged,
	signInWithEmailAndPassword,
	signOut,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import {
	get,
	getDatabase,
	orderByChild,
	query,
	ref,
	set,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';

const firebaseConfig = {
	apiKey: 'AIzaSyBR-ImRkDyL_K3mwur6en4sXjj2WB9a-cs',
	authDomain: 'bulgarian-demonlist.firebaseapp.com',
	databaseURL:
		'https://bulgarian-demonlist-default-rtdb.europe-west1.firebasedatabase.app/',
	projectId: 'bulgarian-demonlist',
	storageBucket: 'bulgarian-demonlist.appspot.com',
	messagingSenderId: '580475986041',
	appId: '1:580475986041:web:82cc42325c06f6aa8f34a8',
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);

// Configurable multiplier for pack completion bonus points (0.10 = 10% of sum of level points)
export const PACK_BONUS_MULTIPLIER = 0.10;

export function calculatePoints(pos) {
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

export function calculatePackLevelPointsSum(packLevels, levelPositionByName, calculatePointsFn) {
	if (!Array.isArray(packLevels) || !packLevels.length) {
		return 0;
	}
	return packLevels.reduce((total, levelName) => {
		const pos = levelPositionByName.get(levelName) ?? Infinity;
		return total + (typeof calculatePointsFn === 'function' ? calculatePointsFn(pos) : 0);
	}, 0);
}

export function calculatePackBonusPoints(pack, baseLevelPointsSum = 0) {
	if (!pack) return 0;
	const percentVal = typeof pack.bonusPercent === 'number' && !isNaN(pack.bonusPercent)
		? pack.bonusPercent
		: (PACK_BONUS_MULTIPLIER * 100);
	const percentBonus = baseLevelPointsSum * (percentVal / 100);
	const flatBonus = typeof pack.bonusFlat === 'number' && !isNaN(pack.bonusFlat)
		? pack.bonusFlat
		: 0;
	return Math.max(0, percentBonus + flatBonus);
}

export function byId(id) {
	return document.getElementById(id);
}

export function normalizeKey(value) {
	return String(value ?? '').trim().toLowerCase();
}

export function getYouTubeVideoId(url) {
	if (!url) {
		return null;
	}

	const match = String(url).match(
		/(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
	);
	return match ? match[1] : null;
}

export function getYouTubeThumbnail(url, quality = 'mqdefault') {
	const videoId = getYouTubeVideoId(url);
	return videoId
		? `https://img.youtube.com/vi/${videoId}/${quality}.jpg`
		: '';
}

// Ordered from best to worst. maxresdefault/sddefault only exist for some videos;
// hqdefault and mqdefault are always generated.
const THUMBNAIL_FALLBACKS = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault'];

// When a thumbnail quality doesn't exist, YouTube responds with a 120x90 grey
// placeholder (often without triggering `error`), so we check the size as well.
const YOUTUBE_PLACEHOLDER_WIDTH = 120;

export function setYouTubeThumbnail(img, url, qualities = THUMBNAIL_FALLBACKS) {
	const videoId = getYouTubeVideoId(url);
	if (!img || !videoId) {
		return;
	}

	let index = 0;

	const tryNext = () => {
		index += 1;
		if (index < qualities.length) {
			img.src = `https://img.youtube.com/vi/${videoId}/${qualities[index]}.jpg`;
		} else {
			img.removeEventListener('load', handleLoad);
			img.removeEventListener('error', tryNext);
		}
	};

	const handleLoad = () => {
		if (img.naturalWidth === YOUTUBE_PLACEHOLDER_WIDTH && index < qualities.length - 1) {
			tryNext();
			return;
		}
		img.removeEventListener('load', handleLoad);
		img.removeEventListener('error', tryNext);
	};

	img.addEventListener('load', handleLoad);
	img.addEventListener('error', tryNext);
	img.src = `https://img.youtube.com/vi/${videoId}/${qualities[0]}.jpg`;
}

export function openExternal(url) {
	if (!url) {
		return;
	}

	window.open(url, '_blank', 'noopener,noreferrer');
}

export function setText(element, value, fallback = '') {
	if (element) {
		element.textContent = value ?? fallback;
	}
}

function renderNavLinks() {
	const nav = byId('nav_links');
	if (!nav) {
		return;
	}

	const user = auth.currentUser;
	const adminLink = user ? '<li><a href="admin.html">Admin</a></li>' : '';

	nav.innerHTML = `
      <li><a href="roulette.html">Roulette</a></li>
      <li><a href="leaderboard.html">Leaderboard</a></li>
      <li><a href="calculator.html">Calculator</a></li>
      <li><a href="guidelines.html">Guidelines</a></li>
      ${adminLink}
    `;
}

export function initAuthNavigation() {
	onAuthStateChanged(auth, () => {
		renderNavLinks();
	});
}

// Versioned localStorage cache backed by a tiny `meta/lastUpdated` node (~20 bytes per visit).
const META_LAST_UPDATED_PATH = 'meta/lastUpdated';
const LEVELS_CACHE_KEY = 'bdl-cache-levels-v2';
const BUNDLE_CACHE_KEY = 'bdl-cache-bundle-v2';
const LEGACY_LEVELS_CACHE_KEY = 'bdl-levels-cache-v1';
const FALLBACK_CACHE_TTL_MS = 15 * 60 * 1000; // Used only before meta/lastUpdated exists in RTDB.

function readStorageJson(key) {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function writeStorageJson(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Ignore quota or private-browsing storage errors.
	}
}

function removeStorageKey(key) {
	try {
		localStorage.removeItem(key);
	} catch {
		// Ignore unavailable storage.
	}
}

export function clearLocalDataCaches() {
	removeStorageKey(LEVELS_CACHE_KEY);
	removeStorageKey(BUNDLE_CACHE_KEY);
	removeStorageKey(LEGACY_LEVELS_CACHE_KEY);
}

export async function touchDatabaseVersion() {
	clearLocalDataCaches();
	try {
		await set(ref(db, META_LAST_UPDATED_PATH), Date.now());
	} catch (error) {
		console.warn('Could not update meta/lastUpdated timestamp.', error);
	}
}

async function fetchRemoteVersion() {
	try {
		const snap = await get(ref(db, META_LAST_UPDATED_PATH));
		const value = snap.val();
		return value !== null && value !== undefined ? value : null;
	} catch {
		return null;
	}
}

function isCacheEntryValid(entry, remoteVersion) {
	if (!entry || typeof entry !== 'object') {
		return false;
	}
	if (remoteVersion !== null) {
		return entry.version === remoteVersion;
	}
	return (
		entry.version === null &&
		Number.isFinite(entry.cachedAt) &&
		Date.now() - entry.cachedAt < FALLBACK_CACHE_TTL_MS
	);
}

function extractCompactLevels(levelsSnapshot) {
	const levels = [];
	levelsSnapshot.forEach((snap) => {
		const val = snap.val();
		if (!val?.name || typeof val.pos !== 'number') {
			return;
		}
		// Strip nested `records` so cached levels stay tiny.
		levels.push({
			key: snap.key,
			name: val.name,
			creator: val.creator || '',
			video: val.video || '',
			pos: val.pos,
		});
	});
	levels.sort((a, b) => a.pos - b.pos);
	return levels;
}

function extractCompactUsers(usersSnapshot) {
	const users = [];
	usersSnapshot.forEach((snap) => {
		const val = snap.val();
		const rawRecords = val?.records;
		if (!val?.name || !rawRecords || typeof rawRecords !== 'object') {
			return;
		}
		const records = {};
		let count = 0;
		Object.entries(rawRecords).forEach(([recKey, rec]) => {
			if (!rec?.name) return;
			records[recKey] = {
				name: rec.name,
				video: rec.video || '',
				first: Boolean(rec.first),
			};
			count += 1;
		});
		if (count === 0) return;
		users.push({
			key: snap.key,
			name: val.name,
			province: val.province || '',
			records,
		});
	});
	return users;
}

function extractCompactPacks(packsSnapshot) {
	const packs = [];
	packsSnapshot.forEach((snap) => {
		const val = snap.val();
		if (!val?.name || !Array.isArray(val.levels)) {
			return;
		}
		packs.push({
			key: snap.key,
			...val,
		});
	});
	return packs;
}

function extractCompactTiers(tiersSnapshot) {
	const tiers = [];
	tiersSnapshot.forEach((snap) => {
		const val = snap.val();
		if (!val?.name) {
			return;
		}
		tiers.push({
			key: snap.key,
			...val,
		});
	});
	return tiers;
}

export function readCachedLevelsSync() {
	const cached = readStorageJson(LEVELS_CACHE_KEY);
	return Array.isArray(cached?.levels) ? cached.levels : [];
}

export async function getLevelsCached({ forceRefresh = false } = {}) {
	const remoteVersion = await fetchRemoteVersion();

	if (!forceRefresh) {
		const cached = readStorageJson(LEVELS_CACHE_KEY);
		if (Array.isArray(cached?.levels) && isCacheEntryValid(cached, remoteVersion)) {
			return {
				levels: cached.levels,
				fromCache: true,
				version: remoteVersion,
			};
		}
	}

	const levelsSnapshot = await get(query(ref(db, 'levels'), orderByChild('pos')));
	const levels = extractCompactLevels(levelsSnapshot);

	writeStorageJson(LEVELS_CACHE_KEY, {
		version: remoteVersion,
		cachedAt: Date.now(),
		levels,
	});

	return {
		levels,
		fromCache: false,
		version: remoteVersion,
	};
}

export async function getLeaderboardBundleCached({ forceRefresh = false } = {}) {
	const remoteVersion = await fetchRemoteVersion();

	if (!forceRefresh) {
		const cachedBundle = readStorageJson(BUNDLE_CACHE_KEY);
		if (
			cachedBundle &&
			Array.isArray(cachedBundle.users) &&
			Array.isArray(cachedBundle.levels) &&
			Array.isArray(cachedBundle.packs) &&
			Array.isArray(cachedBundle.tiers) &&
			isCacheEntryValid(cachedBundle, remoteVersion)
		) {
			return {
				users: cachedBundle.users,
				levels: cachedBundle.levels,
				packs: cachedBundle.packs,
				tiers: cachedBundle.tiers,
				fromCache: true,
				version: remoteVersion,
			};
		}
	}

	// Reuse fresh levels cache if already loaded by index.html or roulette.html!
	let levels = null;
	if (!forceRefresh) {
		const cachedLevels = readStorageJson(LEVELS_CACHE_KEY);
		if (
			Array.isArray(cachedLevels?.levels) &&
			isCacheEntryValid(cachedLevels, remoteVersion)
		) {
			levels = cachedLevels.levels;
		}
	}

	const requests = [
		get(ref(db, 'users')),
		get(ref(db, 'packs')),
		get(ref(db, 'tiers')),
	];
	if (!levels) {
		requests.push(get(query(ref(db, 'levels'), orderByChild('pos'))));
	}

	const snapshots = await Promise.all(requests);
	const users = extractCompactUsers(snapshots[0]);
	const packs = extractCompactPacks(snapshots[1]);
	const tiers = extractCompactTiers(snapshots[2]);

	const now = Date.now();
	if (!levels) {
		levels = extractCompactLevels(snapshots[3]);
		writeStorageJson(LEVELS_CACHE_KEY, {
			version: remoteVersion,
			cachedAt: now,
			levels,
		});
	}

	writeStorageJson(BUNDLE_CACHE_KEY, {
		version: remoteVersion,
		cachedAt: now,
		users,
		levels,
		packs,
		tiers,
	});

	return {
		users,
		levels,
		packs,
		tiers,
		fromCache: false,
		version: remoteVersion,
	};
}
