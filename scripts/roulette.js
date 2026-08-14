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
const summaryScreen = byId('summary-screen');
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
const restartBtn = byId('restart-btn');
const summaryTitle = byId('summary-title');
const summarySubtitle = byId('summary-subtitle');
const summaryHistoryList = byId('summary-history-list');
const summaryRemainingList = byId('summary-remaining-list');
const summaryHistoryTitle = byId('summary-history-title');
const summaryRemainingTitle = byId('summary-remaining-title');

let allLevels = [];
let gameQueue = [];
let currentLevel = null;
let currentReq = 1;
let round = 1;
let runHistory = [];

initAuthNavigation();

function serializeLevel(level) {
	if (!level) return null;
	return {
		pos: typeof level.pos === 'number' ? level.pos : 0,
		name: level.name || '',
		creator: level.creator || 'Unknown creator',
		video: level.video || '',
	};
}

function shuffleArray(array) {
	for (let index = array.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(Math.random() * (index + 1));
		[array[index], array[randomIndex]] = [array[randomIndex], array[index]];
	}
	return array;
}

function startGameUI() {
	startScreen?.classList.add('hide');
	summaryScreen?.classList.add('hide');
	gameScreen?.classList.remove('hide');
	resultsSection?.classList.remove('hide');
}

function renderCard(level) {
	if (!activeContainer) return;
	activeContainer.innerHTML = '';

	const container = document.createElement('div');
	container.classList.add('level-container', 'active-card');

	const image = document.createElement('img');
	image.className = 'level-img';
	image.src = getYouTubeThumbnail(level.video, 'maxresdefault') || getYouTubeThumbnail(level.video);
	image.alt = `${level.name} thumbnail`;
	image.title = 'Watch completion video';
	image.addEventListener('click', () => openExternal(level.video));

	const textDiv = document.createElement('div');
	textDiv.className = 'level-text-container';

	const title = document.createElement('h4');
	title.className = 'level-name';
	setText(title, `#${level.pos} - ${level.name}`);
	title.addEventListener('click', () => openExternal(level.video));

	const creator = document.createElement('p');
	creator.className = 'level-creator';
	setText(creator, `by ${level.creator || 'Unknown creator'}`);

	textDiv.append(title, creator);
	container.append(image, textDiv);
	activeContainer.append(container);
}

function createHistoryCard(entry) {
	const card = document.createElement('div');
	card.classList.add('level-container', 'result-card');

	const image = document.createElement('img');
	image.className = 'level-img';
	image.src = getYouTubeThumbnail(entry.video);
	image.alt = `${entry.name} thumbnail`;
	image.title = 'Watch video';
	image.addEventListener('click', () => openExternal(entry.video));

	const textDiv = document.createElement('div');
	textDiv.className = 'level-text-container';

	const title = document.createElement('h4');
	title.className = 'level-name';
	setText(title, `#${entry.pos} - ${entry.name}`);

	const creator = document.createElement('p');
	creator.className = 'level-creator';
	setText(creator, `by ${entry.creator || 'Unknown creator'}`);

	textDiv.append(title, creator);

	const percentDiv = document.createElement('div');
	percentDiv.className = 'level-percent-display result-percent';
	setText(percentDiv, `${entry.got}%`);

	card.append(image, textDiv, percentDiv);
	return card;
}

function createRemainingCard(level, projectedReq = null) {
	const card = document.createElement('div');
	card.classList.add('level-container', 'remaining-card');

	const image = document.createElement('img');
	image.className = 'level-img';
	image.src = getYouTubeThumbnail(level.video);
	image.alt = `${level.name} thumbnail`;
	image.title = 'Watch video';
	image.addEventListener('click', () => openExternal(level.video));

	const textDiv = document.createElement('div');
	textDiv.className = 'level-text-container';

	const title = document.createElement('h4');
	title.className = 'level-name';
	setText(title, `#${level.pos} - ${level.name}`);

	const creator = document.createElement('p');
	creator.className = 'level-creator';
	setText(creator, `by ${level.creator || 'Unknown creator'}`);

	textDiv.append(title, creator);

	const percentDiv = document.createElement('div');
	percentDiv.className = 'level-percent-display remaining-percent';
	if (typeof projectedReq === 'number') {
		setText(percentDiv, `${projectedReq}%`);
	}

	card.append(image, textDiv, percentDiv);
	return card;
}

function showRunSummary(isGivenUp = true) {
	gameScreen?.classList.add('hide');
	resultsSection?.classList.add('hide');
	summaryScreen?.classList.remove('hide');

	if (isGivenUp) {
		setText(summaryTitle, 'Run Ended');
		setText(
			summarySubtitle,
			`You gave up at Round ${round} with a requirement of ${currentReq}%.`,
		);
	} else {
		setText(summaryTitle, 'Congratulations! Run Completed!');
		setText(
			summarySubtitle,
			`You reached 100% requirement in ${runHistory.length} rounds!`,
		);
	}

	if (summaryHistoryList) {
		summaryHistoryList.innerHTML = '';
		if (runHistory.length === 0) {
			const msg = document.createElement('p');
			msg.className = 'empty-list-msg';
			setText(msg, 'No levels were completed in this run.');
			summaryHistoryList.append(msg);
		} else {
			runHistory.forEach((entry) => {
				summaryHistoryList.append(createHistoryCard(entry));
			});
		}
	}

	if (summaryHistoryTitle) {
		setText(summaryHistoryTitle, `Completed Levels (${runHistory.length})`);
	}

	const remainingLevels = [currentLevel, ...gameQueue].filter(Boolean);
	if (summaryRemainingList) {
		summaryRemainingList.innerHTML = '';
		if (remainingLevels.length === 0) {
			const msg = document.createElement('p');
			msg.className = 'empty-list-msg';
			setText(msg, 'All levels in the queue were completed.');
			summaryRemainingList.append(msg);
		} else {
			remainingLevels.forEach((level, index) => {
				const projectedReq = Math.min(100, currentReq + index);
				summaryRemainingList.append(createRemainingCard(level, projectedReq));
			});
		}
	}

	if (summaryRemainingTitle) {
		setText(summaryRemainingTitle, `Remaining Levels (${remainingLevels.length})`);
	}

	summaryScreen?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetGame() {
	startScreen?.classList.remove('hide');
	gameScreen?.classList.add('hide');
	summaryScreen?.classList.add('hide');
	resultsSection?.classList.add('hide');
	if (activeContainer) activeContainer.innerHTML = '';
	if (resultsList) resultsList.innerHTML = '';
	if (summaryHistoryList) summaryHistoryList.innerHTML = '';
	if (summaryRemainingList) summaryRemainingList.innerHTML = '';
	currentLevel = null;
	gameQueue = [];
	runHistory = [];
	round = 1;
	currentReq = 1;
}

function loadNextLevel() {
	if (gameQueue.length === 0) {
		currentLevel = null;
		alert('You have completed every single level on the list! Incredible.');
		showRunSummary(false);
		return;
	}

	currentLevel = gameQueue.shift();
	renderCard(currentLevel);

	setText(roundDisplay, String(round));
	setText(reqDisplay, `${currentReq}%`);
	if (percentInput) {
		percentInput.value = '';
		percentInput.focus();
	}
}

function saveGame() {
	if (!currentLevel && runHistory.length === 0 && gameQueue.length === 0) {
		alert('There is no active run to save.');
		return;
	}

	const saveObject = {
		version: 2,
		currentReq,
		round,
		currentLevel: serializeLevel(currentLevel),
		queue: gameQueue.map(serializeLevel),
		history: runHistory.map((entry) => ({
			pos: entry.pos,
			name: entry.name,
			creator: entry.creator,
			video: entry.video,
			req: entry.req,
			got: entry.got,
		})),
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
	if (
		Array.isArray(saveObject.queue) &&
		saveObject.queue.length > 0 &&
		typeof saveObject.queue[0] === 'object' &&
		saveObject.queue[0]?.name
	) {
		const restoredQueue = saveObject.queue.filter(Boolean);
		const restoredCurrentLevel =
			saveObject.currentLevel && saveObject.currentLevel?.name
				? saveObject.currentLevel
				: null;

		return restoredCurrentLevel
			? [restoredCurrentLevel, ...restoredQueue]
			: restoredQueue;
	}

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
	const file = event.target.files?.[0];
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
					'Save loaded! All levels in the queue have been played. Showing run summary.',
				);
				showRunSummary(false);
				return;
			}

			if (gameQueue.length === 0) {
				alert('Save file seems empty or corrupted. Please start a new game.');
				return;
			}

			if (resultsList) {
				resultsList.innerHTML = '';
				runHistory.forEach((entry) => {
					resultsList.append(createHistoryCard(entry));
				});
			}

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
	gameQueue = shuffleArray([...allLevels]).slice(0, 100);
	currentReq = 1;
	round = 1;
	if (resultsList) resultsList.innerHTML = '';

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

	const historyEntry = {
		pos: currentLevel.pos,
		name: currentLevel.name,
		creator: currentLevel.creator,
		video: currentLevel.video,
		req: currentReq,
		got: inputVal,
	};

	runHistory.push(historyEntry);

	if (resultsList) {
		resultsList.append(createHistoryCard(historyEntry));
	}

	currentReq = inputVal + 1;
	if (currentReq > 100) {
		showRunSummary(false);
		return;
	}

	round += 1;
	loadNextLevel();
});

percentInput?.addEventListener('keydown', (e) => {
	if (e.key === 'Enter') {
		submitBtn?.click();
	}
});

giveUpBtn?.addEventListener('click', () => {
	if (confirm('Are you sure you want to give up?')) {
		showRunSummary(true);
	}
});

restartBtn?.addEventListener('click', () => {
	resetGame();
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

