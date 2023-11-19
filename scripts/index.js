// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, query, orderByKey, orderByChild, orderByValue, get } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js"
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
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

const levelSection = document.getElementById("levels-container")


get(query(ref(db, "levels"), orderByChild('pos')))
  .then((snapshot) => {
    snapshot.forEach(child => {
      let levelContainer = document.createElement("div")
      levelContainer.classList.add("level-container")
      levelSection.append(levelContainer)

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
        location.href = "level.html?pos=" + child.val().pos
      }
      textContainer.append(levelName)

      let levelCreator = document.createElement("p")
      levelCreator.innerHTML = child.val().creator
      levelCreator.classList.add("level-creator")
      textContainer.append(levelCreator)
    })
  })
