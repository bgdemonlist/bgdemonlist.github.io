// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, set, orderByChild, orderByKey, query, get } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js"
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { ref as sRef,getStorage, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";
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
const auth = getAuth();
const storage = getStorage();
const ul = document.getElementById("nav_links");
onAuthStateChanged(auth, (user) => {
    if (user) {
      const uid = user.uid;
      ul.innerHTML = 
      `
      <li><a href="admin.html">Admin</a></li>
      <li><a href="roulette.html">Roulette</a></li>
      <li><a href="leaderboard.html">Leaderboard</a></li>
      `
      console.log("signed in")
    } else {
        ul.innerHTML = 
        `
        <li><a href="roulette.html">Roulette</a></li>
        <li><a href="leaderboard.html">Leaderboard</a></li>
        `
        console.log("not signed in")
    }
  });

const leaderboard = document.getElementById("players-list")
const playerIcon = document.getElementById("player-icon")
const playerSearch = document.getElementById("player-search")
const playerName = document.getElementById("player-name")
const hardestText = document.getElementById("hardest-text")
const pointsText = document.getElementById("points-text")
const rankText = document.getElementById("rank-text")
const completionsText = document.getElementById("completions-text")
const completionsList = document.getElementById("completions-list")
let playerPos = 0
let playerList = []
let levelsList = []

function getPosFromLevelName(name){
    for(let i in levelsList){
        if(name.localeCompare(levelsList[i].name)==0){
            return levelsList[i].pos;
        }
    }
}

function calculatePoints(pos){
//     if p <= 20:
//     # Steep Elite Curve
//     points = 322.2 * (0.945**(p-1)) + 0.8
// else:
//     # Balanced List Curve
//     points = 106.2 * (0.9882**(p-20))
    if(pos<=20){
        return 322.2 * (0.945**(pos-1)) + 0.8
    }else if(pos<=400){
        return 106.2 * (0.9882**(pos-20))
    }else return 1
}

await get(ref(db, "users")).then(users => {
    users.forEach(user=>{
        playerList.push(user.val());
    })
})

await playerList.forEach(player=>{
    player.points = 0;
    player.hardest = Object.values(player.records)[0]
})

await get(query(ref(db, "levels"), orderByChild('pos'))).then(levels => {
    levels.forEach(level=>{
        levelsList.push(level.val());
    })
})

await playerList.forEach(player=>{
    Object.values(player.records).forEach(value=>{
        if(getPosFromLevelName(value.name)<getPosFromLevelName(player.hardest.name)){
            player.hardest = value
        }
        player.points+=calculatePoints(getPosFromLevelName(value.name), levelsList.length)
    })
})

await playerList.sort((a, b) => (b.points - a.points))

let i=1

await playerList.forEach(player => {
    if (player.points != 0) {
        let newPlayer = document.createElement("div")
        if (i % 2 == 0) {
            newPlayer.classList.add("player-container-2")
        } else {
            newPlayer.classList.add("player-container-1")
        }

        newPlayer.addEventListener("click", () => {
            completionsList.innerHTML = ""
            playerPos = playerList.indexOf(player)
            playerName.innerHTML = playerList[playerPos].name
            hardestText.innerHTML = player.hardest.name
            pointsText.innerHTML = (player.points).toFixed(2)
            completionsText.innerHTML = Object.values(playerList[playerPos].records).length + " (" + Object.values(playerList[playerPos].records).filter(record=>record.first==true).length + " FVs)"
            rankText.innerHTML = "#" + (playerPos+1)
            let records = Object.values(player.records)
            records.forEach((record, index) => {
                let isLast = index === records.length - 1;

                if (record.first == true) {
                    completionsList.innerHTML += `
                    <li><a href="${record.video}"><h2 id="first">${record.name}</h2></a></li>
                    ${!isLast ? '<li>-</li>' : ''}
                    `
                }else{
                    completionsList.innerHTML += `
                    <li><a href="${record.video}"><h2>${record.name}</h2></a></li>
                    ${!isLast ? '<li>-</li>' : ''}
                    `
                }
                
            })

            getDownloadURL(sRef(storage, `player-icons/${playerList[playerPos].name}.jpg`)).then(url=>{
                playerIcon.src = url
            }).catch(e=>getDownloadURL(sRef(storage, 'player-icons/default-user-icon.png')).then(url=>{
                playerIcon.src = url
            }))
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

playerSearch.addEventListener("input", e => {
    const value = e.target.value.toLowerCase()
    playerList.forEach(player => {
        const isVisible = player.name.toLowerCase().includes(value)
        player.element.classList.toggle("hide", !isVisible)
    })
})

completionsList.innerHTML = ""
playerName.innerHTML = playerList[playerPos].name
hardestText.innerHTML = playerList[playerPos].hardest.name
pointsText.innerHTML = (playerList[playerPos].points).toFixed(2)
completionsText.innerHTML = Object.values(playerList[playerPos].records).length + " (" + Object.values(playerList[playerPos].records).filter(record=>record.first==true).length + " FVs)"
rankText.innerHTML = "#" + (playerPos+1)
let records = Object.values(playerList[playerPos].records)
records.forEach((record, index) => {
    let isLast = index === records.length - 1;
    if (record.first == true) {
        completionsList.innerHTML += `
        <li><a href="${record.video}"><h2 id="first">${record.name}</h2></a></li>
        ${!isLast ? '<li>-</li>' : ''}
        `
    }else{
         completionsList.innerHTML += `
        <li><a href="${record.video}"><h2>${record.name}</h2></a></li>
        ${!isLast ? '<li>-</li>' : ''}
        `
    }
                
})
getDownloadURL(sRef(storage, `player-icons/${playerList[playerPos].name}.jpg`)).then(url=>{
    playerIcon.src = url
}).catch(e=>getDownloadURL(sRef(storage, 'player-icons/default-user-icon.png')).then(url=>{
    playerIcon.src = url
}))