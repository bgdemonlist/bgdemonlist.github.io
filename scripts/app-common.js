import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
	getAuth,
	onAuthStateChanged,
	signInWithEmailAndPassword,
	signOut,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';

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
      <li><a href="guidelines.html">Guidelines</a></li>
      ${adminLink}
    `;
}

export function initAuthNavigation() {
	onAuthStateChanged(auth, () => {
		renderNavLinks();
	});
}
