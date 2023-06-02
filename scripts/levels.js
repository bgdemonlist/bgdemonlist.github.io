// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, query, orderByKey, orderByChild, orderByValue } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    databaseURL: "https://bulgarian-demonlist-default-rtdb.europe-west1.firebasedatabase.app/",
    apiKey: "AIzaSyBR-ImRkDyL_K3mwur6en4sXjj2WB9a-cs",
    authDomain: "bulgarian-demonlist.firebaseapp.com",
    projectId: "bulgarian-demonlist",
    storageBucket: "bulgarian-demonlist.appspot.com",
    messagingSenderId: "580475986041",
    appId: "1:580475986041:web:82cc42325c06f6aa8f34a8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const levelsDB = query(ref(db, 'levels'), orderByChild('pos'))

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const position = urlParams.get(pos)
console.log(position)
document.title = position

let levelName
let levelCreator
let levelPos
let levelVid
onValue(levelsDB, function (snapshot) {
    if (snapshot.exists()) {
        let levelData = Object.entries(snapshot.val())
        for(let i = 0;i<levelData.length;i++){
            if(levelData[i][1].pos == position){
                console.log(levelData[i])
                levelName = levelData[i][1].name
                levelCreator = levelData[i][1].creator
                levelVid = levelData[i][1].video
                levelVid = levelVid.substr(17)
                levelPos = levelData[i][1].pos

                document.getElementById("levelName").innerHTML = levelName
                document.getElementById("levelCreator").textContent = "by " + levelCreator
                console.log("https://www.youtube.com/embed/" + levelVid)
                document.getElementById("level-video").src = "https://www.youtube.com/embed/" + levelVid
                document.getElementById("score").innerHTML = 323-(levelPos-1)*6
                
                break
            }
        }
    }
})
