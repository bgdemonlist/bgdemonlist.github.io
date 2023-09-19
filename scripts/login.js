// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, set, orderByChild, orderByKey, query, get } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js"
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
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
        loginButtonNav.style.display = "none"
        userButtonNav.style.display = "block"
    }
    else{
        console.log("not logged in")
    }
})

const submitLoginButton = document.getElementById("submitLogIn")
const emailLogInInput = document.getElementById("emailLogIn")
const passLogInInput = document.getElementById("passLogIn")
const submitSignUpButton = document.getElementById("submitSignUp")
const emailSignUpInput = document.getElementById("emailSignUp")
const passSignUpInput = document.getElementById("passSignUp")
const userNameInput = document.getElementById("userName")
const displaySignUp = document.getElementById("sign-up")
const SignUpSection = document.getElementById("sign-up-section")
const LoginSection = document.getElementById("login-section")
const forgotPass = document.getElementById("forgot-pass")

displaySignUp.addEventListener("click", function(){
    SignUpSection.style.display = "flex"
    LoginSection.style.display = "none"
})

forgotPass.addEventListener("click", function(){
    alert('dm "soletki" on discord 👍')
})

submitSignUpButton.addEventListener("click", function(){
    const email = emailSignUpInput.value
    const pass = passSignUpInput.value
    const name = userNameInput.value

    onAuthStateChanged(auth, (user) => {
        if (user) {
            get(ref(db, "users/"+user.uid)).then(snapshot=>{
                userButtonNav.innerHTML = 
                `
                <button>${snapshot.val().name}</button>
                `
                loginButtonNav.style.display = "none"
                userButtonNav.style.display = "block"
            })
        }
    })
})

submitLoginButton.addEventListener("click", function(){
    const email = emailLogInInput.value
    const pass = passLogInInput.value

    signInWithEmailAndPassword(auth, email, pass).then(cred => {
        console.log(cred)
        location.href = "user.html"
    })
})