// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, set, ref, push, onValue, remove, query, orderByKey, orderByChild, orderByValue, get } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js"
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
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
const auth = getAuth();

const ul = document.getElementById("nav_links");

onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    ul.innerHTML = 
    `
    <li><a href="admin.html">Admin</a></li>
    <li><a href="leaderboard.html">Leaderboard</a></li>
    `
    console.log("signed in")
  } else {
    let password = prompt("Enter password")
    signInWithEmailAndPassword(auth, "pishka@gmail.com", password)
      ul.innerHTML = 
      `
      <li><a href="leaderboard.html">Leaderboard</a></li>
      `
      console.log("not signed in")
  }
});

const levelSection = document.getElementById("levels-container")
const levelSectionDiv = document.getElementById("levels-container-div")
const levelSearch = document.getElementById("level-search")
const plus = document.getElementById("plus")
const minus = document.getElementById("minus")
const blackScreen = document.getElementById("black-screen")
const addPopup = document.getElementById("add-popup")
const addPopupForm = document.getElementById("add-popup-bottom")
const removePopupForm = document.getElementById("remove-popup-bottom")
const removePopupCookies = document.getElementById("remove-popup-cookies")
const removePopup = document.getElementById("remove-popup")
const addPopupExit = document.getElementById("add-popup-close")
const removePopupExit = document.getElementById("remove-popup-close")
let levelsList = [];


onValue(query(ref(db, "levels"), orderByChild('pos')), snapshot=>{
  levelSectionDiv.innerHTML = ""
  snapshot.forEach(child => {
    let temp = child.val();
    let levelContainer = document.createElement("div")
    levelContainer.classList.add("level-container")
    levelSectionDiv.append(levelContainer)
    temp.element = levelContainer

    let levelImage = document.createElement("img")
    levelImage.classList.add("level-img")
    let videoId = child.val().video.substr(17)
    let image = "https://img.youtube.com/vi/" + videoId + "/maxresdefault.jpg"
    levelImage.src = image
    levelContainer.append(levelImage)
    levelImage.addEventListener("click", function () {
      window.open(child.val().video)
    })

    let textContainer = document.createElement("div")
    textContainer.classList.add("level-text-container")
    levelContainer.append(textContainer)

    let levelName = document.createElement("h4")
    levelName.innerHTML = "#" + child.val().pos + " - " + child.val().name
    levelName.classList.add("level-name")
    levelName.onclick = function () {
      location.href = "admin-level.html?pos=" + child.val().pos
    }
    textContainer.append(levelName)

    let levelCreator = document.createElement("p")
    levelCreator.innerHTML = child.val().creator
    levelCreator.classList.add("level-creator")
    textContainer.append(levelCreator)

    let levelControls = document.createElement("div")
    levelControls.classList.add("level-controls")
    levelContainer.append(levelControls)

    let upArrow = document.createElement("i")
    upArrow.classList.add("fa-solid")
    upArrow.classList.add("fa-angle-up")
    upArrow.addEventListener("click", ()=>{
      set(ref(db, 'levels/' + child.val().name.toLowerCase()), {
        name: child.val().name,
        creator: child.val().creator,
        video: child.val().video,
        pos: child.val().pos-1
      })
      set(ref(db, 'levels/' + levelsList[child.val().pos-2].name.toLowerCase()), {
        name: levelsList[child.val().pos-2].name,
        creator: levelsList[child.val().pos-2].creator,
        video: levelsList[child.val().pos-2].video,
        pos: child.val().pos
      })
      let templ = levelsList[child.val().pos-2];
      levelsList[child.val().pos-2] = levelsList[child.val().pos-1];
      levelsList[child.val().pos-1] = templ;
    })
    levelControls.append(upArrow)

    let downArrow = document.createElement("i")
    downArrow.classList.add("fa-solid")
    downArrow.classList.add("fa-angle-down")
    downArrow.addEventListener("click", ()=>{
      set(ref(db, 'levels/' + child.val().name.toLowerCase()), {
        name: child.val().name,
        creator: child.val().creator,
        video: child.val().video,
        pos: child.val().pos+1
      })
      set(ref(db, 'levels/' + levelsList[child.val().pos].name.toLowerCase()), {
        name: levelsList[child.val().pos].name,
        creator: levelsList[child.val().pos].creator,
        video: levelsList[child.val().pos].video,
        pos: child.val().pos
      })
      let templ = levelsList[child.val().pos];
      levelsList[child.val().pos] = levelsList[child.val().pos-1];
      levelsList[child.val().pos-1] = templ;
    })
    levelControls.append(downArrow)


    let cookie = document.createElement("h3");
    cookie.addEventListener("click", ()=>{
      document.getElementById("remove-popup-input").value = child.val().name;
    })
    cookie.innerHTML = "<h3>#" + child.val().pos + " - " + child.val().name + "</h3>"
    temp.cookie = cookie;
    levelsList.push(temp);
    document.getElementById("remove-popup-cookies-div").append(cookie)
    
  })
})


levelSearch.addEventListener("input", e => {
  const value = e.target.value.toLowerCase()
  levelsList.forEach(level => {
      const isVisible = level.name.toLowerCase().includes(value)
      level.element.classList.toggle("hide", !isVisible)
  })
})

plus.addEventListener("click", ()=>{
  blackScreen.style.display = "flex"
  addPopup.style.display = "flex"
})

minus.addEventListener("click", ()=>{
  blackScreen.style.display = "flex"
  removePopup.style.display = "flex"
})

addPopupExit.addEventListener("click", ()=>{
  blackScreen.style.display = "none"
  addPopup.style.display = "none"
})

removePopupExit.addEventListener("click", ()=>{
  blackScreen.style.display = "none"
  removePopup.style.display = "none"
})

addPopupForm.addEventListener("submit", (event)=>{
  
  event.preventDefault()

  const name = document.getElementById("add-popup-name").value
  const creator = document.getElementById("add-popup-creator").value
  const video = document.getElementById("add-popup-video").value
  const pos = document.getElementById("add-popup-pos").value

  if(pos!=""){

    for(let i=pos-1;i<levelsList.length;i++){

      set(ref(db, 'levels/' + levelsList[i].name.toLowerCase()), {
            name: levelsList[i].name,
            creator: levelsList[i].creator,
            video: levelsList[i].video,
            pos: levelsList[i].pos+1
          })
    }

    set(ref(db, 'levels/' + name.toLowerCase()), {
      name: name,
      creator: creator,
      video: video,
      pos: parseInt(pos)
    })
  }
})

document.getElementById("remove-popup-input").addEventListener("keyup", e=>{
  const value = e.target.value.toLowerCase()
  levelsList.forEach(level => {
      const isVisible = level.name.toLowerCase().includes(value)
      level.cookie.classList.toggle("hide", !isVisible)
  })
})

removePopupForm.addEventListener("submit", (event)=>{

  event.preventDefault()

  const name = document.getElementById("remove-popup-input").value

  get(ref(db, "levels/" + name.toLowerCase())).then((level)=>{
    // console.log(level.val())

    for(let i=levelsList.length-1;i>=level.val().pos;i--){
      set(ref(db, 'levels/' + levelsList[i].name.toLowerCase()), {
        name: levelsList[i].name,
        creator: levelsList[i].creator,
        video: levelsList[i].video,
        pos: levelsList[i].pos-1
      })
    }
    if(level.val().records){
      const records = Object.values(level.val().records)
      records.forEach(record=>{
        remove(ref(db, 'users/'+record.name+'/records/'+name.toLowerCase()))
      })
    }

  })

  remove(ref(db, 'levels/' + name.toLowerCase()))
})