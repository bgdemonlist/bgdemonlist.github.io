import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
	getAuth,
	onAuthStateChanged,
	signInWithEmailAndPassword,
	signOut,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js';

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
export const storage = getStorage(app);

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
