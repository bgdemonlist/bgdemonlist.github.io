// Import the functions you need from the SDKs you need
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
	getDatabase,
	ref,
	set,
	get,
	push,
	onValue,
	remove,
	query,
	orderByKey,
	orderByChild,
	orderByValue,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import {
	getAuth,
	createUserWithEmailAndPassword,
	onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
	databaseURL:
		'https://bulgarian-demonlist-default-rtdb.europe-west1.firebasedatabase.app/',
	apiKey: 'AIzaSyBR-ImRkDyL_K3mwur6en4sXjj2WB9a-cs',
	authDomain: 'bulgarian-demonlist.firebaseapp.com',
	projectId: 'bulgarian-demonlist',
	storageBucket: 'bulgarian-demonlist.appspot.com',
	messagingSenderId: '580475986041',
	appId: '1:580475986041:web:82cc42325c06f6aa8f34a8',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();
const ul = document.getElementById('nav_links');
onAuthStateChanged(auth, (user) => {
	if (user) {
		const uid = user.uid;
		ul.innerHTML = `
      <li><a href="admin.html">Admin</a></li>
	  <li><a href="roulette.html">Roulette</a></li>
      <li><a href="leaderboard.html">Leaderboard</a></li>
      `;
		console.log('signed in');
	} else {
		ul.innerHTML = `
		<li><a href="roulette.html">Roulette</a></li>
        <li><a href="leaderboard.html">Leaderboard</a></li>
        `;
		console.log('not signed in');
	}
});

function calculatePoints(pos) {
	if (pos > 150) return 0;
	if (pos <= 12) {
		return Math.pow(0.9, pos) * 323 + 32.3;
	} else {
		return Math.pow(1.026, 200 - pos);
	}
}

const urlParams = new URL(document.location).searchParams;
const position = urlParams.get('pos');
const plus = document.getElementById('plus');
const blackScreen = document.getElementById('black-screen');
const addPopup = document.getElementById('add-popup');
const addPopupForm = document.getElementById('add-popup-bottom');
const addPopupExit = document.getElementById('add-popup-close');

function getYouTubeVideoId(url) {
	const regex =
		/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
	const match = url.match(regex);
	return match ? match[1] : null;
}

get(ref(db, 'levels')).then((snapshot) => {
	snapshot.forEach((child) => {
		if (child.val().pos == position) {
			document.getElementById('victors-container').innerHTML +=
				'<a><h2>No records yet...</h2></a>';
			document.getElementById('levelName').innerHTML = child.val().name;
			document.title = '#' + position + ' - ' + child.val().name;
			document.getElementById('levelCreator').innerHTML =
				'By ' + child.val().creator;
			let levelVid = getYouTubeVideoId(child.val().video);
			document.getElementById('level-video').src =
				'https://www.youtube.com/embed/' + levelVid;
			let temp = calculatePoints(position).toFixed(2);
			if (temp < 0) {
				temp = 0;
			}
			document.getElementById('score').innerHTML = temp;
			document.getElementById('victor-count').innerHTML =
				Object.keys(child.val().records).length + ' victors';
			if (child.val().records) {
				document.getElementById('victors-container').innerHTML =
					'<div id="victors-title"><h2>Holder</h2></div>';
				get(
					query(
						ref(
							db,
							'levels/' +
								child.val().name.toLowerCase() +
								'/records'
						),
						orderByChild('recordNum')
					)
				).then((recordsSnap) => {
					recordsSnap.forEach((record) => {
						console.log(record.val());
						document.getElementById(
							'victors-container'
						).innerHTML += `
                    <a href="${record.val().video}"><h2 class="victor">${
							record.val().name
						}</h2></a>
                    `;
					});
				});
			}
		}
	});
});

plus.addEventListener('click', () => {
	blackScreen.style.display = 'flex';
	addPopup.style.display = 'flex';
});

addPopupExit.addEventListener('click', () => {
	blackScreen.style.display = 'none';
	addPopup.style.display = 'none';
});

addPopupForm.addEventListener('submit', (event) => {
	event.preventDefault();

	const name = document.getElementById('add-popup-name').value;
	const video = document.getElementById('add-popup-video').value;
	const level = document.getElementById('levelName').innerHTML;
	let recordNum = 0;

	get(ref(db, 'levels/' + level.toLowerCase() + '/records/')).then(
		(records) => {
			if (records.val()) recordNum = Object.keys(records.val()).length;
		}
	);

	get(ref(db, 'users/' + name))
		.then((user) => {
			if (!user.val()) {
				set(ref(db, 'users/' + name), {
					name: name,
				});
			}
		})
		.then(() => {
			set(
				ref(
					db,
					'users/' + name + '/records/' + level.toLocaleLowerCase()
				),
				{
					first: recordNum == 0,
					name: level,
					video: video,
				}
			);

			set(
				ref(
					db,
					'levels/' +
						level.toLowerCase() +
						'/records/' +
						name.toLowerCase()
				),
				{
					name: name,
					video: video,
					recordNum: recordNum,
				}
			);
		});
});
