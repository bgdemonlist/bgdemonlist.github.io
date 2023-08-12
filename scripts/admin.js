// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, set, orderByChild, orderByKey, query, get, update } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js"
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

const loginButtonNav = document.getElementById("loginButtonNav")
const userButtonNav = document.getElementById("userButtonNav")

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
        loginButtonNav.style.display = "none"
        userButtonNav.style.display = "block"
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
const name = document.getElementById("name")
const levelList = document.getElementById("options")
const moveList = document.getElementById("moveOptions")
const creator = document.getElementById("creator")
const position = document.getElementById("position")
const videoLink = document.getElementById("yt-vid")
const recordContainer = document.getElementById("records")
let levels = []
let recordN = 0

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

get(ref(db, "records")).then((snapshot) => {
    snapshot.forEach(child => {
        let childUid = child.val().uid
        get(ref(db, "users")).then((snapshot) => {
            let childName = snapshot.val()[childUid].name
            // recordContainer.innerHTML +=
            //     `
            // <div>
            //     <p>${childName} | Pos: ${child.val().pos} | <a href="${child.val().video}">Video</a></p>
            //     <p class="control"><i class="fa-solid fa-check accept-record"></i> <i class="fa-regular fa-x deny-record"></i></p>
            // </div>
            // `
            let newContainer = document.createElement("div")
            let firstLine = document.createElement("p")
            firstLine.innerHTML = childName + " | Pos: " + child.val().pos + " | <a href=" + child.val().video + ">Video</a>"
            newContainer.append(firstLine)
            let secondLine = document.createElement("p")
            secondLine.classList.add("control")
            let tick = document.createElement("i")
            tick.classList.add("fa-solid")
            tick.classList.add("fa-check")
            tick.classList.add("accept-record")
            secondLine.append(tick)
            let cross = document.createElement("i")
            cross.classList.add("fa-regular")
            cross.classList.add("fa-x")
            cross.classList.add("deny-record")
            secondLine.append(cross)
            newContainer.append(secondLine)
            recordContainer.append(newContainer)

            tick.addEventListener("click", function () {
                get(query(ref(db, "levels"), orderByChild('pos'))).then((snapshot) => {
                    snapshot.forEach(lev => {
                        if (lev.val().pos == child.val().pos) {
                            if (lev.val().records) {
                                set(ref(db, "levels/" + lev.val().name.toLowerCase() + "/records/" + childName.toLowerCase()), {
                                    name: childName,
                                    video: child.val().video,
                                    recordNum: Object.keys(lev.val().records).length
                                })
                            } else {
                                set(ref(db, "levels/" + lev.val().name.toLowerCase() + "/records/" + childName.toLowerCase()), {
                                    name: childName,
                                    video: child.val().video,
                                    recordNum: 0
                                })
                            }

                            if (lev.val().records) {
                                set(ref(db, "users/" + child.val().uid + "/records/" + lev.val().name.toLowerCase()), {
                                    name: lev.val().name,
                                    video: child.val().video,
                                    first: false
                                })
                            } else {
                                set(ref(db, "users/" + child.val().uid + "/records/" + lev.val().name.toLowerCase()), {
                                    name: lev.val().name,
                                    video: child.val().video,
                                    first: true
                                })
                            }

                        }
                    })
                })

                remove(ref(db, "records/" + child.val().recordId))
            })

            cross.addEventListener("click", function () {
                remove(ref(db, "records/" + child.val().recordId))
            })
        })
    })
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


delInput.addEventListener("keyup", () => {
    let arr = []
    let searchedVal = delInput.value.toLowerCase()
    arr = levels.filter(data => {
        return data.toLowerCase().startsWith(searchedVal)
    })
    arr.forEach(function (i) {
        let newLi = document.createElement("li")
        newLi.innerHTML = i
        newLi.addEventListener("click", function () {
            delInput.value = newLi.innerHTML
        })
        levelList.append(newLi)
    })
    levelList.innerHTML = arr
})

