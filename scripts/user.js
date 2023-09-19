// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, set, orderByChild, orderByKey, query, get } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js"
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
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

onAuthStateChanged(auth, (user) => {
    if(user){
        get(ref(db, "users/"+user.uid)).then(snapshot=>{
            userButtonNav.innerHTML = 
            `
            <button>${snapshot.val().name}</button>
            `
            loginButtonNav.style.display = "none"
            userButtonNav.style.display = "block"
        })
        get(ref(db, "users")).then((snapshot)=>{
            document.getElementById("name").innerHTML = snapshot.val()[user.uid].name
            let records = snapshot.val()[user.uid].records
            for(let i=0;i<Object.keys(records).length;i++){
                let levelName = records[Object.keys(records)[i]].name
                if(records[Object.keys(records)[i]].first==true){
                    document.getElementById("firstVictor").innerHTML+=
                    `
                    <a href="${records[Object.keys(records)[i]].video}"><h3 class="level-text">${levelName}</h3></a>
                    `
                }
                    document.getElementById("completion").innerHTML+=
                    `
                    <a href="${records[Object.keys(records)[i]].video}"><h3 class="level-text">${levelName}</h3></a>
                    `
            }
        })
    }
    else{
        console.log("not logged in")
    }
})

const logoutButton = document.getElementById("logoutButton")

logoutButton.addEventListener("click", function () {
    signOut(auth)
})