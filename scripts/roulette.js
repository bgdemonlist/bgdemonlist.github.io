import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getDatabase, ref, query, orderByChild, get } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

const firebaseConfig = {
    databaseURL: 'https://bulgarian-demonlist-default-rtdb.europe-west1.firebasedatabase.app/',
    apiKey: 'AIzaSyBR-ImRkDyL_K3mwur6en4sXjj2WB9a-cs',
    authDomain: 'bulgarian-demonlist.firebaseapp.com',
    projectId: 'bulgarian-demonlist',
    storageBucket: 'bulgarian-demonlist.appspot.com',
    messagingSenderId: '580475986041',
    appId: '1:580475986041:web:82cc42325c06f6aa8f34a8',
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

const ul = document.getElementById('nav_links');
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const resultsSection = document.getElementById('results-section');
const startBtn = document.getElementById('start-btn');
const activeContainer = document.getElementById('active-level-container');
const percentInput = document.getElementById('percent-input');
const submitBtn = document.getElementById('submit-btn');
const giveUpBtn = document.getElementById('give-up-btn');
const roundDisplay = document.getElementById('round-count');
const reqDisplay = document.getElementById('current-req');
const resultsList = document.getElementById('results-list'); 
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');
const loadFileInput = document.getElementById('load-file-input');

let allLevels = [];
let gameQueue = []; 
let currentLevel = null;
let currentReq = 1;
let round = 1;
let runHistory = [];

onAuthStateChanged(auth, (user) => {
    if (user) {
        ul.innerHTML = `<li><a href="roulette.html">Roulette</a></li><li><a href="admin.html">Admin</a></li><li><a href="leaderboard.html">Leaderboard</a></li>`;
    } else {
        ul.innerHTML = `<li><a href="roulette.html">Roulette</a></li><li><a href="leaderboard.html">Leaderboard</a></li>`;
    }
});

function getYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); 
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

get(query(ref(db, 'levels'), orderByChild('pos')))
    .then((snapshot) => {
        snapshot.forEach((child) => {
            allLevels.push(child.val());
        });
        startBtn.textContent = 'Start Roulette';
        startBtn.disabled = false;
        loadBtn.disabled = false;
    })
    .catch(console.error);

function startGameUI() {
    startScreen.classList.add('hide');
    gameScreen.classList.remove('hide');
    resultsSection.classList.remove('hide');
}

function loadNextLevel() {
    if (gameQueue.length === 0) {
        alert('You have completed every single level on the list! Incredible.');
        return;
    }

    currentLevel = gameQueue.shift(); 
    renderCard(currentLevel);

    roundDisplay.innerText = round;
    reqDisplay.innerText = `${currentReq}%`;
    percentInput.value = '';
    percentInput.focus();
}

function renderCard(level) {
    activeContainer.innerHTML = '';

    let container = document.createElement('div');
    container.classList.add('level-container', 'active-card');

    let img = document.createElement('img');
    img.classList.add('level-img');
    let vidId = getYouTubeVideoId(level.video);
    if (vidId) vidId = vidId.slice(0, 17);
    img.src = vidId ? `https://img.youtube.com/vi/${vidId}/mqdefault.jpg` : '';
    img.addEventListener('click', () => window.open(level.video));

    let textDiv = document.createElement('div');
    textDiv.classList.add('level-text-container');

    let h4 = document.createElement('h4');
    h4.innerHTML = `#${level.pos} - ${level.name}`;
    h4.classList.add('level-name');

    let p = document.createElement('p');
    p.innerHTML = level.creator;
    p.classList.add('level-creator');

    textDiv.append(h4, p);
    container.append(img, textDiv);
    activeContainer.append(container);
}

function addHistoryCard(level, got) {
    let card = document.createElement('div');
    card.classList.add('level-container', 'result-card'); 

    let img = document.createElement('img');
    img.classList.add('level-img');
    let vidId = getYouTubeVideoId(level.video);
    if (vidId) vidId = vidId.slice(0, 17);
    img.src = vidId ? `https://img.youtube.com/vi/${vidId}/mqdefault.jpg` : '';
    img.addEventListener('click', () => window.open(level.video));

    let textDiv = document.createElement('div');
    textDiv.classList.add('level-text-container');

    let h4 = document.createElement('h4');
    h4.classList.add('level-name');
    h4.innerHTML = `#${level.pos} - ${level.name} <span class="result-percent">${got}%</span>`;

    let p = document.createElement('p');
    p.classList.add('level-creator');
    p.innerHTML = `by ${level.creator}`;

    textDiv.append(h4, p);
    card.append(img, textDiv);

    resultsList.insertBefore(card, resultsList.firstChild);
}

function resetGame() {
    startScreen.classList.remove('hide');
    gameScreen.classList.add('hide');
}

startBtn.addEventListener('click', () => {
    if (allLevels.length === 0) return;

    runHistory = [];
    gameQueue = shuffleArray([...allLevels]);
    currentReq = 1;
    round = 1;
    resultsList.innerHTML = ''; 

    startGameUI();
    loadNextLevel();
});

submitBtn.addEventListener('click', () => {
    const inputVal = parseInt(percentInput.value);

    if (isNaN(inputVal) || inputVal < 0 || inputVal > 100) {
        alert('Please enter a valid percentage (0-100)');
        return;
    }
    
    if (inputVal < currentReq) {
        return;
    }

    runHistory.push({
        pos: currentLevel.pos,
        name: currentLevel.name,
        creator: currentLevel.creator,
        video: currentLevel.video,
        req: currentReq,
        got: inputVal
    });

    addHistoryCard(currentLevel, inputVal);

    currentReq = inputVal + 1; 
    if (currentReq > 100) {
        alert('Congratulation! You reached 100% requirement.');
    }
    round++;
    loadNextLevel();
});

giveUpBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to give up?')) {
        resetGame();
    }
});

saveBtn.addEventListener('click', saveGame);

function saveGame() {
    const saveObject = {
        currentReq: currentReq,
        round: round,
        queuePos: gameQueue.map(level => level.pos), 
        history: runHistory
    };

    const json = JSON.stringify(saveObject, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `bdl_roulette_save_${date}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert(`Game saved as ${filename}`);
}

loadBtn.addEventListener('click', () => loadFileInput.click());
loadFileInput.addEventListener('change', loadGame);

function loadGame(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const saveObject = JSON.parse(e.target.result);

            currentReq = saveObject.currentReq || 1;
            round = saveObject.round || 1;
            runHistory = saveObject.history || [];

            const savedQueuePos = saveObject.queuePos || [];
            gameQueue = savedQueuePos.map(pos => 
                allLevels.find(level => level.pos === pos)
            ).filter(level => level);

            if (gameQueue.length === 0 && runHistory.length > 0) {
                 alert("Save loaded! All levels in the queue have been played. You may start a new run.");
                 resetGame();
                 return;
            } else if (gameQueue.length === 0) {
                 alert("Save file seems empty or corrupted. Please start a new game.");
                 return;
            }
            
            resultsList.innerHTML = '';
            runHistory.slice().reverse().forEach(h => {
                addHistoryCard(h, h.got);
            });

            startGameUI();
            currentLevel = gameQueue.shift();
            renderCard(currentLevel);
            
            roundDisplay.innerText = round;
            reqDisplay.innerText = `${currentReq}%`;
            alert(`Game Loaded Successfully! Resuming Round ${round}.`);

        } catch (error) {
            alert('Error loading save file: The file is corrupted or not a valid JSON.');
            console.error(error);
        }
    };
    reader.readAsText(file);
}
