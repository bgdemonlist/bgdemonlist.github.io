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
let playerPos = 1
let playerList = []

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginButtonNav.style.display = "none"
        userButtonNav.style.display = "block"
    }
    else {
        console.log("not logged in")
    }
})

await get(ref(db, "users")).then(snapshot=>{
    snapshot.forEach(child=>{
        let newObject = child.val()
        newObject.points = 0
        if(newObject.records){
            get(ref(db, "levels")).then(snapshot=>{
                Object.keys(newObject.records).forEach(record=>{
                    let pos=snapshot.val()[record].pos
                    newObject.points += (323-((pos-1)*6.46)).toFixed(2)
                })
            })
        }
        playerList.push(newObject)
    })
    console.log(playerList);
    playerList.sort((a, b) => a.points - b.points);
    console.log(playerList);
})