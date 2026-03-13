import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
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

function renderNavLinks(isSignedIn) {
	const nav = byId('nav_links');
	if (!nav) {
		return;
	}

	nav.innerHTML = isSignedIn
		? `
      <li><a href="admin.html">Admin</a></li>
      <li><a href="roulette.html">Roulette</a></li>
      <li><a href="leaderboard.html">Leaderboard</a></li>
    `
		: `
      <li><a href="roulette.html">Roulette</a></li>
      <li><a href="leaderboard.html">Leaderboard</a></li>
    `;
}

export function initAuthNavigation() {
	onAuthStateChanged(auth, (user) => {
		renderNavLinks(Boolean(user));
	});
}
