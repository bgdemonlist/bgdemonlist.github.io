// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, set, orderByChild, orderByKey, query, get, update } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js"
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

function moveDemon(name, newPos) {
    get(ref(db, "levels/" + name)).then(snapshot => {
        get(ref(db, "levels/" + name + "/records")).then(records => {
            if (!records.val()) {
                set(ref(db, "levels/" + name), {
                    creator: snapshot.val().creator,
                    name: snapshot.val().name,
                    pos: newPos,
                    video: snapshot.val().video
                })
            } else {
                set(ref(db, "levels/" + name), {
                    creator: snapshot.val().creator,
                    name: snapshot.val().name,
                    pos: newPos,
                    video: snapshot.val().video,
                    records: snapshot.val().records
                })
            }
        })

    })
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("logged in")
        contentSection.style.display = "block"
        loginForm.style.display = "none"
    }
    else {
        console.log("not logged in")
    }
})
const button = document.getElementById("submit")
const buttondel = document.getElementById("submit2")
const delInput = document.getElementById("del-level-name")
const moveNameInput = document.getElementById("move-level-name")
const movePosInput = document.getElementById("move-level-pos")
const moveSubmit = document.getElementById("submit3")
const recordSubmit = document.getElementById("submit4")
const name = document.getElementById("name")
const levelList = document.getElementById("options")
const moveList = document.getElementById("moveOptions")
const creator = document.getElementById("creator")
const position = document.getElementById("position")
const videoLink = document.getElementById("yt-vid")
const loginForm = document.getElementById("login-form")
const contentSection = document.getElementById("content-section")
const recordLevelName = document.getElementById("record-level-name")
const recordPlayerName = document.getElementById("record-player-name")
const recordVideo = document.getElementById("record-video")
let levels = []

loginForm.addEventListener("submit", (event)=>{
    event.preventDefault()
    const email = document.getElementById("email").value
    const pass = document.getElementById("password").value
    signInWithEmailAndPassword(auth, email, pass).then(()=>{
        contentSection.style.display = "block"
        loginForm.style.display = "none"
    })
    .catch((e)=>{
        alert(e)
    })
})

moveSubmit.addEventListener("click", () => {
    const name = moveNameInput.value.toLowerCase()
    const pos = parseInt(movePosInput.value)
    let oldPos = 0

    get(ref(db, "levels/")).then(snapshot => {
        let lowerCase = name.toLowerCase()
        oldPos = snapshot.val()[lowerCase].pos
        snapshot.forEach(child => {
            if (child.val().pos < oldPos && child.val().pos >= pos && child.val().name.toLowerCase() != name) {
                moveDemon(child.val().name.toLowerCase(), child.val().pos + 1)
            }
            if (child.val().pos > oldPos && child.val().pos <= pos && child.val().name.toLowerCase() != name) {
                moveDemon(child.val().name.toLowerCase(), child.val().pos - 1)
            }
        })

    })

    moveDemon(name, pos)

    moveNameInput.value = ""
    movePosInput.value = ""
})


onValue(query(ref(db, 'levels'), orderByChild('pos')), function (snapshot) {
    if (snapshot.exists()) {
        snapshot.forEach(function (child) {
            let newLi = document.createElement("li")
            newLi.innerHTML = child.val().name
            newLi.addEventListener("click", function () {
                delInput.value = newLi.innerHTML
            })
            let newLi2 = document.createElement("li")
            newLi2.innerHTML = child.val().name
            newLi2.addEventListener("click", function () {
                moveNameInput.value = newLi2.innerHTML
            })
            levelList.append(newLi)
            moveList.append(newLi2)
            levels.push(child.val().name)
        })
    }
})


button.addEventListener("click", function () {
    let levelName = name.value
    let levelCreator = creator.value
    let levelPosition = position.value
    if (parseInt(levelPosition) < 1) {
        levelPosition = '1'
    }
    let levelLink = videoLink.value
    if (levelName != "" && levelCreator != "" && levelPosition != "" && levelLink != "") {
        get(query(ref(db, "levels"), orderByChild('pos')))
            .then((snapshot) => {
                if (parseInt(levelPosition) > Object.keys(snapshot.val()).length + 1) {
                    levelPosition = (Object.keys(snapshot.val()).length + 1).toString()
                }
                set(ref(db, "levels/" + levelName.toLowerCase()), {
                    pos: parseInt(levelPosition),
                    name: levelName,
                    creator: levelCreator,
                    video: levelLink
                })
                snapshot.forEach(child => {
                    if (child.val().pos >= levelPosition && child.val().name != levelName) {
                        moveDemon(child.val().name.toLowerCase(), child.val().pos + 1)
                    }
                })
            })
        name.value = ''
        creator.value = ''
        position.value = ''
        videoLink.value = ''
    }
})

buttondel.addEventListener("click", function () {
    let levelname = delInput.value
    let levelpos = 999
    delInput.value = ""
    get(query(ref(db, "levels"), orderByChild('pos')))
        .then((snapshot) => {
            snapshot.forEach(child => {
                if (child.val().name == levelname) {
                    levelpos = child.val().pos
                }
            })
            snapshot.forEach(child => {
                if (child.val().pos > levelpos) {
                    moveDemon(child.val().name.toLowerCase(), child.val().pos - 1)
                }
            })
        }
        )
    remove(ref(db, "levels/" + levelname.toLowerCase()))

})

recordSubmit.addEventListener("click", async ()=>{
    const levelName = recordLevelName.value
    const playerName = recordPlayerName.value
    const link = recordVideo.value
    let first = true
    let recordNum = 0

    await get(ref(db, "levels/" + levelName.toLowerCase() + "/records")).then(s=>{
        if(s.exists()){
            recordNum = Object.keys(s.val()).length
            first = false
        }
    })

    await get(ref(db, "users/" + playerName)).then(s=>{
        if(!s.exists()){
            set(ref(db, "users/" + playerName),{
                name: playerName
            })
        }
    })

    set(ref(db, "levels/" + levelName.toLowerCase() + "/records/" + playerName.toLowerCase()), {
        name: playerName,
        video: link,
        recordNum: recordNum
    })
    set(ref(db, "users/" + playerName + "/records/" + levelName.toLowerCase()),{
        name: levelName,
        video: link,
        first: first
    })
})