// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getDatabase,
  set,
  ref,
  push,
  onValue,
  remove,
  query,
  orderByChild,
  get
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// Firebase configuration
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

// Navigation links
const ul = document.getElementById("nav_links");

// Handle authentication
onAuthStateChanged(auth, (user) => {
  if (user) {
    ul.innerHTML = `
      <li><a href="admin.html">Admin</a></li>
      <li><a href="leaderboard.html">Leaderboard</a></li>
    `;
    console.log("signed in");
  } else {
    const password = prompt("Enter password");
    signInWithEmailAndPassword(auth, "pishka@gmail.com", password);
    ul.innerHTML = `
      <li><a href="leaderboard.html">Leaderboard</a></li>
    `;
    console.log("not signed in");
  }
});

// UI elements
const levelSectionDiv = document.getElementById("levels-container-div");
const levelSearch = document.getElementById("level-search");
const plus = document.getElementById("plus");
const minus = document.getElementById("minus");
const blackScreen = document.getElementById("black-screen");
const addPopup = document.getElementById("add-popup");
const removePopup = document.getElementById("remove-popup");
const addPopupForm = document.getElementById("add-popup-bottom");
const removePopupForm = document.getElementById("remove-popup-bottom");
const addPopupExit = document.getElementById("add-popup-close");
const removePopupExit = document.getElementById("remove-popup-close");

let levelsList = [];
let levelsAlreadyGenerated = false;

// Render levels ordered by position
onValue(query(ref(db, "levels"), orderByChild("pos")), (snapshot) => {
  levelSectionDiv.innerHTML = "";
  document.getElementById("remove-popup-cookies-div").innerHTML = "";

  snapshot.forEach((child) => {
    const data = child.val();
    const levelContainer = document.createElement("div");
    levelContainer.classList.add("level-container");
    levelSectionDiv.append(levelContainer);
    data.element = levelContainer;

    // Level image
    const levelImage = document.createElement("img");
    levelImage.classList.add("level-img");
    const videoId = data.video.substr(17);
    levelImage.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    levelImage.addEventListener("click", () => window.open(data.video));
    levelContainer.append(levelImage);

    // Level text info
    const textContainer = document.createElement("div");
    textContainer.classList.add("level-text-container");
    levelContainer.append(textContainer);

    const levelName = document.createElement("h4");
    levelName.textContent = `#${data.pos} - ${data.name}`;
    levelName.classList.add("level-name");
    levelName.onclick = () => {
      location.href = `admin-level.html?pos=${data.pos}`;
    };
    textContainer.append(levelName);

    const levelCreator = document.createElement("p");
    levelCreator.textContent = data.creator;
    levelCreator.classList.add("level-creator");
    textContainer.append(levelCreator);

    // Controls for moving levels up/down
    const levelControls = document.createElement("div");
    levelControls.classList.add("level-controls");
    levelContainer.append(levelControls);

    // Move up
    if (data.pos > 1) {
      const upArrow = document.createElement("i");
      upArrow.classList.add("fa-solid", "fa-angle-up");
      upArrow.addEventListener("click", () => moveLevelUp(data, snapshot));
      levelControls.append(upArrow);
    }

    // Move down
    if (data.pos < Object.keys(snapshot.val()).length) {
      const downArrow = document.createElement("i");
      downArrow.classList.add("fa-solid", "fa-angle-down");
      downArrow.addEventListener("click", () => moveLevelDown(data, snapshot));
      levelControls.append(downArrow);
    }

    // Remove cookie
    const cookie = document.createElement("h3");
    cookie.innerHTML = `#${data.pos} - ${data.name}`;
    cookie.addEventListener("click", () => {
      document.getElementById("remove-popup-input").value = data.name;
    });
    data.cookie = cookie;

    if (!levelsAlreadyGenerated) levelsList.push(data);
    document.getElementById("remove-popup-cookies-div").append(cookie);
  });
});

// Search filter
levelSearch.addEventListener("input", (e) => {
  const value = e.target.value.toLowerCase();
  levelsList.forEach((level) => {
    const isVisible = level.name.toLowerCase().includes(value);
    level.element.classList.toggle("hide", !isVisible);
  });
});

// Popup handlers
plus.addEventListener("click", () => {
  blackScreen.style.display = "flex";
  addPopup.style.display = "flex";
});

minus.addEventListener("click", () => {
  blackScreen.style.display = "flex";
  removePopup.style.display = "flex";
});

addPopupExit.addEventListener("click", closePopups);
removePopupExit.addEventListener("click", closePopups);

function closePopups() {
  blackScreen.style.display = "none";
  addPopup.style.display = "none";
  removePopup.style.display = "none";
}

// Add new level
addPopupForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.getElementById("add-popup-name").value;
  const creator = document.getElementById("add-popup-creator").value;
  const video = document.getElementById("add-popup-video").value;
  const pos = parseInt(document.getElementById("add-popup-pos").value);

  get(ref(db, "levels")).then((levels) => {
    levels.forEach((level) => {
      const data = level.val();
      if (data.pos >= pos) {
        set(ref(db, `levels/${data.name.toLowerCase()}`), {
          ...data,
          pos: data.pos + 1
        });
      }
    });
  });

  set(ref(db, `levels/${name.toLowerCase()}`), {
    name,
    creator,
    video,
    pos
  });
});

// Remove level
document.getElementById("remove-popup-input").addEventListener("keyup", (e) => {
  const value = e.target.value.toLowerCase();
  levelsList.forEach((level) => {
    const isVisible = level.name.toLowerCase().includes(value);
    level.cookie.classList.toggle("hide", !isVisible);
  });
});

removePopupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("remove-popup-input").value;

  get(ref(db, `levels/${name.toLowerCase()}`)).then((curr) => {
    get(ref(db, "levels")).then((levels) => {
      levels.forEach((level) => {
        const data = level.val();
        if (data.pos > curr.val().pos) {
          set(ref(db, `levels/${data.name.toLowerCase()}`), {
            ...data,
            pos: data.pos - 1
          });
        }
      });
    });
  }).then(() => remove(ref(db, `levels/${name.toLowerCase()}`)));
});

// Helper functions for moving levels
function moveLevelUp(level, snapshot) {
  const prev = levelsList[level.pos - 2];
  swapPositions(level, prev, -1);
}

function moveLevelDown(level, snapshot) {
  const next = levelsList[level.pos];
  swapPositions(level, next, +1);
}

function swapPositions(curr, other, offset) {
  // Update current
  set(ref(db, `levels/${curr.name.toLowerCase()}`), {
    ...curr,
    pos: curr.pos + offset
  });

  // Update swapped
  set(ref(db, `levels/${other.name.toLowerCase()}`), {
    ...other,
    pos: curr.pos
  });

  // Swap locally
  const temp = levelsList[curr.pos - 1 + offset];
  levelsList[curr.pos - 1 + offset] = levelsList[curr.pos - 1];
  levelsList[curr.pos - 1] = temp;
}
