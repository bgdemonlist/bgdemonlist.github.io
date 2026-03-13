import {
	get,
	orderByChild,
	query,
	ref,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import {
	byId,
	db,
	getYouTubeThumbnail,
	initAuthNavigation,
	openExternal,
	setText,
} from './app-common.js';

const startScreen = byId('start-screen');
const gameScreen = byId('game-screen');
const resultsSection = byId('results-section');
const startBtn = byId('start-btn');
const activeContainer = byId('active-level-container');
const percentInput = byId('percent-input');
const submitBtn = byId('submit-btn');
const giveUpBtn = byId('give-up-btn');
const roundDisplay = byId('round-count');
const reqDisplay = byId('current-req');
const resultsList = byId('results-list');
const saveBtn = byId('save-btn');
const loadBtn = byId('load-btn');
const loadFileInput = byId('load-file-input');

let allLevels = [];
let gameQueue = [];
let currentLevel = null;
let currentReq = 1;
let round = 1;
let runHistory = [];

initAuthNavigation();

function shuffleArray(array) {
	for (let index = array.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1));
		[array[index], array[randomIndex]] = [array[randomIndex], array[index]];
	}
	return array;
}

function startGameUI() {
	startScreen.classList.add('hide');
	gameScreen.classList.remove('hide');
	resultsSection.classList.remove('hide');
}

function renderCard(level) {
	activeContainer.innerHTML = '';

	const container = document.createElement('div');
	container.classList.add('level-container', 'active-card');

	const image = document.createElement('img');
	image.className = 'level-img';
	image.src = getYouTubeThumbnail(level.video);
	image.alt = `${level.name} thumbnail`;
	image.addEventListener('click', () => openExternal(level.video));

	const textDiv = document.createElement('div');
	textDiv.className = 'level-text-container';

	const title = document.createElement('h4');
	title.className = 'level-name';
	setText(title, `#${level.pos} - ${level.name}`);

	const creator = document.createElement('p');
	creator.className = 'level-creator';
	setText(creator, level.creator, 'Unknown creator');

	textDiv.append(title, creator);
	container.append(image, textDiv);
	activeContainer.append(container);
}

function addHistoryCard(level, got) {
	const card = document.createElement('div');
	card.classList.add('level-container', 'result-card');

	const image = document.createElement('img');
	image.className = 'level-img';
	image.src = getYouTubeThumbnail(level.video);
	image.alt = `${level.name} thumbnail`;
	image.addEventListener('click', () => openExternal(level.video));

	const textDiv = document.createElement('div');
	textDiv.className = 'level-text-container';

	const title = document.createElement('h4');
	title.className = 'level-name';
	setText(title, `#${level.pos} - ${level.name}`);
	const percent = document.createElement('span');
	percent.className = 'result-percent';
	setText(percent, `${got}%`);
	title.append(' ', percent);

	const creator = document.createElement('p');
	creator.className = 'level-creator';
	setText(creator, `by ${level.creator ?? 'Unknown creator'}`);

	textDiv.append(title, creator);
	card.append(image, textDiv);
	resultsList.insertBefore(card, resultsList.firstChild);
}

function resetGame() {
	startScreen.classList.remove('hide');
	gameScreen.classList.add('hide');
	resultsSection.classList.add('hide');
	activeContainer.innerHTML = '';
	currentLevel = null;
}

function loadNextLevel() {
	if (gameQueue.length === 0) {
		currentLevel = null;
		alert('You have completed every single level on the list! Incredible.');
		resetGame();
		return;
	}

	currentLevel = gameQueue.shift();
	renderCard(currentLevel);

	setText(roundDisplay, String(round));
	setText(reqDisplay, `${currentReq}%`);
	percentInput.value = '';
	percentInput.focus();
}

function saveGame() {
	if (!currentLevel && runHistory.length === 0 && gameQueue.length === 0) {
		alert('There is no active run to save.');
		return;
	}

	const saveObject = {
		currentReq,
		round,
		currentLevelPos: currentLevel?.pos ?? null,
		queuePos: gameQueue.map((level) => level.pos),
		history: runHistory,
	};

	const json = JSON.stringify(saveObject, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const date = new Date().toISOString().slice(0, 10);
	const filename = `bdl_roulette_save_${date}.json`;

	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.append(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
	alert(`Game saved as ${filename}`);
}

function restoreQueue(saveObject) {
	const savedQueuePos = Array.isArray(saveObject.queuePos)
		? saveObject.queuePos
		: [];
	const restoredQueue = savedQueuePos
		.map((pos) => allLevels.find((level) => level.pos === pos))
		.filter(Boolean);
	const restoredCurrentLevel = allLevels.find(
		(level) => level.pos === saveObject.currentLevelPos,
	);

	return restoredCurrentLevel
		? [restoredCurrentLevel, ...restoredQueue]
		: restoredQueue;
}

function loadGame(event) {
	const file = event.target.files[0];
	if (!file) {
		return;
	}

	const reader = new FileReader();
	reader.onload = ({ target }) => {
		try {
			const saveObject = JSON.parse(target.result);
			currentReq = Number.isInteger(saveObject.currentReq)
				? saveObject.currentReq
				: 1;
			round = Number.isInteger(saveObject.round) ? saveObject.round : 1;
			runHistory = Array.isArray(saveObject.history) ? saveObject.history : [];
			gameQueue = restoreQueue(saveObject);

			if (gameQueue.length === 0 && runHistory.length > 0) {
				alert(
					'Save loaded! All levels in the queue have been played. You may start a new run.',
				);
				resetGame();
				return;
			}

			if (gameQueue.length === 0) {
				alert('Save file seems empty or corrupted. Please start a new game.');
				return;
			}

			resultsList.innerHTML = '';
			runHistory
				.slice()
				.reverse()
				.forEach((entry) => addHistoryCard(entry, entry.got));

			startGameUI();
			loadNextLevel();
			setText(roundDisplay, String(round));
			setText(reqDisplay, `${currentReq}%`);
			alert(`Game Loaded Successfully! Resuming Round ${round}.`);
		} catch (error) {
			alert('Error loading save file: The file is corrupted or not valid JSON.');
			console.error(error);
		}
	};

	reader.readAsText(file);
	event.target.value = '';
}

startBtn?.addEventListener('click', () => {
	if (allLevels.length === 0) {
		return;
	}

	runHistory = [];
	gameQueue = shuffleArray([...allLevels]);
	currentReq = 1;
	round = 1;
	resultsList.innerHTML = '';

	startGameUI();
	loadNextLevel();
});

submitBtn?.addEventListener('click', () => {
	if (!currentLevel) {
		alert('Start or load a run before submitting a result.');
		return;
	}

	const inputVal = Number.parseInt(percentInput.value, 10);
	if (Number.isNaN(inputVal) || inputVal < 0 || inputVal > 100) {
		alert('Please enter a valid percentage (0-100).');
		return;
	}

	if (inputVal < currentReq) {
		alert(`You need at least ${currentReq}% to continue.`);
		return;
	}

	runHistory.push({
		pos: currentLevel.pos,
		name: currentLevel.name,
		creator: currentLevel.creator,
		video: currentLevel.video,
		req: currentReq,
		got: inputVal,
	});

	addHistoryCard(currentLevel, inputVal);

	currentReq = inputVal + 1;
	if (currentReq > 100) {
		alert('Congratulations! You reached the 100% requirement.');
		resetGame();
		return;
	}

	round += 1;
	loadNextLevel();
});

giveUpBtn?.addEventListener('click', () => {
	if (confirm('Are you sure you want to give up?')) {
		resetGame();
	}
});

saveBtn?.addEventListener('click', saveGame);
loadBtn?.addEventListener('click', () => loadFileInput.click());
loadFileInput?.addEventListener('change', loadGame);

get(query(ref(db, 'levels'), orderByChild('pos')))
	.then((snapshot) => {
		snapshot.forEach((child) => {
			const level = child.val();
			if (level?.name && typeof level.pos === 'number') {
				allLevels.push(level);
			}
		});

		if (allLevels.length > 0) {
			setText(startBtn, 'Start Roulette');
			startBtn.disabled = false;
			loadBtn.disabled = false;
		} else {
			setText(startBtn, 'No Levels Available');
		}
	})
	.catch((error) => {
		console.error('Failed to load roulette levels.', error);
		setText(startBtn, 'Failed to Load Levels');
	});
