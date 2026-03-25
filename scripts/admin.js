import {
	ref,
	update,
	onValue,
	query,
	orderByChild,
	get,
	set,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import {
	onAuthStateChanged,
	signInWithEmailAndPassword,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import {
	auth,
	byId,
	db,
	getYouTubeThumbnail,
	initAuthNavigation,
	normalizeKey,
	openExternal,
	setText,
} from './app-common.js';

const levelSectionDiv = byId('levels-container-div');
const levelSearch = byId('level-search');
const plus = byId('plus');
const minus = byId('minus');
const blackScreen = byId('black-screen');
const addPopup = byId('add-popup');
const removePopup = byId('remove-popup');
const addPopupForm = byId('add-popup-bottom');
const removePopupForm = byId('remove-popup-bottom');
const addPopupExit = byId('add-popup-close');
const removePopupExit = byId('remove-popup-close');
const removePopupInput = byId('remove-popup-input');
const removePopupCookiesDiv = byId('remove-popup-cookies-div');

let levelsList = [];

initAuthNavigation();

let signInAttempted = false;

onAuthStateChanged(auth, (user) => {
	if (user || signInAttempted) {
		return;
	}

	signInAttempted = true;
	const password = prompt('Enter password');
	if (!password) {
		return;
	}

	signInWithEmailAndPassword(auth, 'pishka@gmail.com', password).catch(
		(error) => {
			console.error('Admin sign-in failed.', error);
		},
	);
});

function closePopups() {
	blackScreen.style.display = 'none';
	addPopup.style.display = 'none';
	removePopup.style.display = 'none';
}

function createLevelRow(level, totalLevels) {
	const levelContainer = document.createElement('div');
	levelContainer.className = 'level-container';
	level.element = levelContainer;

	const levelImage = document.createElement('img');
	levelImage.className = 'level-img';
	levelImage.src = getYouTubeThumbnail(level.video, 'maxresdefault');
	levelImage.alt = `${level.name} thumbnail`;
	levelImage.addEventListener('click', () => openExternal(level.video));
	levelContainer.append(levelImage);

	const textContainer = document.createElement('div');
	textContainer.className = 'level-text-container';

	const levelName = document.createElement('h4');
	levelName.className = 'level-name';
	setText(levelName, `#${level.pos} - ${level.name}`);
	levelName.addEventListener('click', () => {
		location.href = `admin-level.html?pos=${level.pos}`;
	});
	textContainer.append(levelName);

	const levelCreator = document.createElement('p');
	levelCreator.className = 'level-creator';
	setText(levelCreator, level.creator, 'Unknown creator');
	textContainer.append(levelCreator);
	levelContainer.append(textContainer);

	const controls = document.createElement('div');
	controls.className = 'level-controls';

	if (level.pos > 1) {
		const upArrow = document.createElement('i');
		upArrow.classList.add('fa-solid', 'fa-angle-up');
		upArrow.addEventListener('click', () => moveLevel(level, -1));
		controls.append(upArrow);
	}

	if (level.pos < totalLevels) {
		const downArrow = document.createElement('i');
		downArrow.classList.add('fa-solid', 'fa-angle-down');
		downArrow.addEventListener('click', () => moveLevel(level, 1));
		controls.append(downArrow);
	}

	levelContainer.append(controls);
	return levelContainer;
}

function createRemoveCookie(level) {
	const cookie = document.createElement('h3');
	setText(cookie, `#${level.pos} - ${level.name}`);
	cookie.addEventListener('click', () => {
		removePopupInput.value = level.name;
	});
	level.cookie = cookie;
	return cookie;
}

function filterLevels(searchValue) {
	const value = searchValue.toLowerCase().trim();
	levelsList.forEach((level) => {
		const isVisible = level.name.toLowerCase().includes(value);
		level.element.classList.toggle('hide', !isVisible);
		level.cookie.classList.toggle('hide', !isVisible);
	});
}

async function moveLevel(level, direction) {
	const currentIndex = levelsList.findIndex(
		(candidate) => candidate.name === level.name,
	);
	const other = levelsList[currentIndex + direction];

	if (!level || !other) {
		return;
	}

	await Promise.all([
		set(ref(db, `levels/${normalizeKey(level.name)}`), {
			...level,
			pos: level.pos + direction,
		}),
		set(ref(db, `levels/${normalizeKey(other.name)}`), {
			...other,
			pos: level.pos,
		}),
	]);
}

onValue(query(ref(db, 'levels'), orderByChild('pos')), (snapshot) => {
	levelsList = [];
	levelSectionDiv.innerHTML = '';
	removePopupCookiesDiv.innerHTML = '';

	const orderedLevels = [];
	snapshot.forEach((child) => {
		const level = child.val();
		if (level?.name && typeof level.pos === 'number') {
			orderedLevels.push(level);
		}
	});

	orderedLevels.forEach((level) => {
		levelSectionDiv.append(createLevelRow(level, orderedLevels.length));
		removePopupCookiesDiv.append(createRemoveCookie(level));
		levelsList.push(level);
	});

	filterLevels(levelSearch?.value ?? '');
});

levelSearch?.addEventListener('input', (event) => {
	filterLevels(event.target.value);
});

removePopupInput?.addEventListener('keyup', (event) => {
	filterLevels(event.target.value);
});

plus?.addEventListener('click', () => {
	blackScreen.style.display = 'flex';
	addPopup.style.display = 'flex';
});

minus?.addEventListener('click', () => {
	blackScreen.style.display = 'flex';
	removePopup.style.display = 'flex';
});

addPopupExit?.addEventListener('click', closePopups);
removePopupExit?.addEventListener('click', closePopups);

addPopupForm?.addEventListener('submit', async (event) => {
	event.preventDefault();

	const name = byId('add-popup-name').value.trim();
	const creator = byId('add-popup-creator').value.trim();
	const video = byId('add-popup-video').value.trim();
	const pos = Number.parseInt(byId('add-popup-pos').value, 10);
	const levelKey = normalizeKey(name);

	if (!name || !creator || !video || !Number.isInteger(pos) || pos < 1) {
		alert('Please fill out all fields with a valid position.');
		return;
	}

	if (!levelKey) {
		alert('Please enter a valid level name.');
		return;
	}

	const snap = await get(query(ref(db, 'levels'), orderByChild('pos')));
	const nextPosition = Math.min(pos, snap.size + 1);

	if ((await get(ref(db, `levels/${levelKey}`))).exists()) {
		alert('A level with that name already exists.');
		return;
	}

	const updates = {};
	snap.forEach((child) => {
		const data = child.val();
		if (data.pos >= nextPosition) {
			updates[`levels/${child.key}/pos`] = data.pos + 1;
		}
	});

	updates[`levels/${levelKey}`] = {
		name,
		creator,
		video,
		pos: nextPosition,
	};

	await update(ref(db), updates);
	addPopupForm.reset();
	closePopups();
});

removePopupForm?.addEventListener('submit', async (event) => {
	event.preventDefault();

	const nameInput = removePopupInput.value.trim();
	const key = normalizeKey(nameInput);
	if (!key) {
		alert('Please choose a level to remove.');
		return;
	}

	const currentSnapshot = await get(ref(db, `levels/${key}`));
	if (!currentSnapshot.exists()) {
		alert('Level not found.');
		return;
	}

	const removedPos = currentSnapshot.val().pos;
	const [snap, usersSnapshot] = await Promise.all([
		get(query(ref(db, 'levels'), orderByChild('pos'))),
		get(ref(db, 'users')),
	]);
	const updates = {};

	snap.forEach((childSnapshot) => {
		const data = childSnapshot.val();
		if (data.pos > removedPos) {
			updates[`levels/${childSnapshot.key}/pos`] = data.pos - 1;
		}
	});

	usersSnapshot.forEach((userSnapshot) => {
		const userData = userSnapshot.val();
		if (userData?.records && userData.records[key]) {
			updates[`users/${userSnapshot.key}/records/${key}`] = null;
		}
	});

	updates[`levels/${key}`] = null;

	await update(ref(db), updates);
	removePopupForm.reset();
	closePopups();
});
