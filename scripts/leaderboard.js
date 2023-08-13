// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, set, orderByChild, orderByKey, query, get } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js"
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBR-ImRkDyL_K3mwur6en4sXjj2WB9a-cs",
    authDomain: "bulgarian-demonlist.firebaseapp.com",
    databaseURL: "https://bulgarian-demonlist-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "bulgarian-demonlist",
    storageBucket: "bulgarian-demonlist.appspot.com",
    messagingSenderId: "580475986041",
    appId: "1:580475986041:web:82cc42325c06f6aa8f34a8"
};


const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const loginButtonNav = document.getElementById("loginButtonNav")
const userButtonNav = document.getElementById("userButtonNav")
const leaderboard = document.getElementById("players-list")
const userStats = document.getElementById("userStats")
const playerSearch = document.getElementById("player-search")
const playerName = document.getElementById("player-name")
const hardestText = document.getElementById("hardest-text")
const pointsText = document.getElementById("points-text")
const firstVictorList = document.getElementById("first-victor-list")
const completionsList = document.getElementById("completions-list")
let playerPos = 1
let playerList = []

onAuthStateChanged(auth, (user) => {
    if (user) {
        get(ref(db, "users/" + user.uid)).then(snapshot => {
            userButtonNav.innerHTML =
                `
            <button>${snapshot.val().name}</button>
            `
            loginButtonNav.style.display = "none"
            userButtonNav.style.display = "block"
        })
    }
})

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

await get(ref(db, "users")).then(users => {
    users.forEach(user => {
        let temp = user.val()
        temp.points = 0
        if (user.val().records) {
            get(ref(db, "levels")).then(levels => {
                let recordList = Object.keys(user.val().records)
                temp.hardest = levels.val()[recordList[0]]
                recordList.forEach(record => {
                    let recordPos = levels.val()[record].pos
                    if (levels.val()[record].pos < temp.hardest.pos) {
                        temp.hardest = levels.val()[record]
                    }
                    temp.points += (323 - (recordPos - 1) * 6.46)
                })
                playerList.sort((a, b) => (b.points - a.points))
            })
        }
        playerList.push(temp)
    })
})

await sleep(200)

let i = 1

playerList.forEach(player => {
    if (player.points != 0) {
        let newPlayer = document.createElement("div")
        if (i % 2 == 0) {
            newPlayer.classList.add("player-container-2")
        } else {
            newPlayer.classList.add("player-container-1")
        }

        newPlayer.addEventListener("click", () => {
            firstVictorList.innerHTML = ""
            completionsList.innerHTML = ""
            playerPos = playerList.indexOf(player)
            playerName.innerHTML = playerList[playerPos].name
            hardestText.innerHTML = player.hardest.name
            pointsText.innerHTML = player.points
            let records = Object.values(player.records)
            records.forEach(record => {
                if (record.first == true) {
                    firstVictorList.innerHTML += `
                    <li><a href="${record.video}"><h2>${record.name}</h2></a></li>
                    `
                }
                completionsList.innerHTML += `
                    <li><a href="${record.video}"><h2>${record.name}</h2></a></li>
                    `
            })
        })

        newPlayer.innerHTML =
            `
                <h2>${"#" + i + " - " + player.name}</h2>
                <h3>${(player.points).toFixed(2)}</h3>
            `

        player.element = newPlayer
        leaderboard.append(newPlayer)
    }
    i++
})

await sleep(200)

playerSearch.addEventListener("input", e => {
    const value = e.target.value.toLowerCase()
    playerList.forEach(player => {
        const isVisible = player.name.toLowerCase().includes(value)
        player.element.classList.toggle("hide", !isVisible)
    })
})

let player = playerList[0]
firstVictorList.innerHTML = ""
completionsList.innerHTML = ""
playerPos = playerList.indexOf(player)
playerName.innerHTML = playerList[playerPos].name
hardestText.innerHTML = player.hardest.name
pointsText.innerHTML = player.points
let records = Object.values(player.records)
records.forEach(record => {
    if (record.first == true) {
        firstVictorList.innerHTML += `
                    <li><a href="${record.video}"><h2>${record.name}</h2></a></li>
                    `
    }
    completionsList.innerHTML += `
                    <li><a href="${record.video}"><h2>${record.name}</h2></a></li>
                    `
})