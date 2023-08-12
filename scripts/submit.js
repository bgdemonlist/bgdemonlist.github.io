// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, push, child, onValue, remove, set, orderByChild, orderByKey, query, get } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js"
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

const posInput = document.getElementById("pos")
const vidInput = document.getElementById("yt-vid")
const submitButton = document.getElementById("submit")
const loginError = document.getElementById("login-error")
const section = document.getElementById("container")

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginButtonNav.style.display = "none"
        userButtonNav.style.display = "block"
        loginError.style.display = "none"
        const uid = user.uid
        submitButton.addEventListener("click", function () {
            if (posInput.value != "" && vidInput.value != "") {
                const levelPos = posInput.value
                const vidLink = vidInput.value
                const newKey = push(child(ref(db), 'records')).key;
                set(ref(db, "records/" + newKey), {
                    uid: uid,
                    pos: levelPos,
                    video: vidLink,
                    recordId: newKey
                }).then(()=>{
                    alert("Record submitted!")
                    location.href = "user.html"
                })
                posInput.value = ''
                vidInput.value = ''
                
            }else{
                alert("Missing info!")
            }

        })
    }
    else {
        section.style.display = "none"
    }
})

