// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getDatabase, ref, get, push, onValue, remove, query, orderByKey, orderByChild, orderByValue } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js"
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
const auth = getAuth();
const ul = document.getElementById("nav_links");
onAuthStateChanged(auth, (user) => {
    if (user) {
      const uid = user.uid;
      ul.innerHTML = 
      `
      <li><a href="admin.html">Admin</a></li>
      <li><a href="roulette.html">Roulette</a></li>
      <li><a href="leaderboard.html">Leaderboard</a></li>
      `
      console.log("signed in")
    } else {
        ul.innerHTML = 
        `
        <li><a href="roulette.html">Roulette</a></li>
        <li><a href="leaderboard.html">Leaderboard</a></li>
        `
        console.log("not signed in")
    }
  });

function calculatePoints(pos, n){
    return 1 + 322 * Math.exp(-((Math.log(322) / (n - 1)) * (pos - 1)));
}



const urlParams = (new URL(document.location)).searchParams
const position = urlParams.get("pos")

// get(ref(db, "levels")).then(snapshot => {
//     snapshot.forEach(child => {
//         if (child.val().pos == position) {
//             document.getElementById("victors-container").innerHTML += "<a><h2>No records yet...</h2></a>"
//             document.getElementById("levelName").innerHTML = child.val().name
//             document.title = "#" + position + " - " + child.val().name
//             document.getElementById("levelCreator").innerHTML = "By " + child.val().creator
//             let levelVid = child.val().video.substr(17)
//             document.getElementById("level-video").src = "https://www.youtube.com/embed/" + levelVid
//             document.getElementById("score").innerHTML = 323 - (position - 1) * 6
//             document.getElementById("victor-count").innerHTML = Object.keys(child.val().records).length + " victors"
//             if (child.val().records) {
//                 document.getElementById("victors-container").innerHTML = '<div id="victors-title"><h2>Holder</h2></div>'
//                 for (let i = 0; i < Object.keys(child.val().records).length; i++) {
//                     let name = Object.keys(child.val().records)[i]
//                     document.getElementById("victors-container").innerHTML +=
//                         `
//                     <a href="${child.val().records[name].video}"><h2 class="victor">${child.val().records[name].name}</h2></a>
//                     `

//                 }
//             }


//         }
//     })
// })


get(ref(db, "levels")).then(snapshot => {
    snapshot.forEach(child => {
        if (child.val().pos == position) {
            document.getElementById("victors-container").innerHTML += "<a><h2>No records yet...</h2></a>"
            document.getElementById("levelName").innerHTML = child.val().name
            document.title = "#" + position + " - " + child.val().name
            document.getElementById("levelCreator").innerHTML = "By " + child.val().creator
            let levelVid = child.val().video.substr(17)
            document.getElementById("level-video").src = "https://www.youtube.com/embed/" + levelVid
            let temp = calculatePoints(position, Object.keys(snapshot.val()).length).toFixed(2)
            console.log(Object.keys(snapshot.val()).length)
            if(temp < 0){
                temp = 0
            }
            document.getElementById("score").innerHTML = temp
            document.getElementById("victor-count").innerHTML = Object.keys(child.val().records).length + " victors"
            if (child.val().records) {
                document.getElementById("victors-container").innerHTML = '<div id="victors-title"><h2>Holder</h2></div>'
                get(query(ref(db, "levels/"+child.val().name.toLowerCase()+"/records"), orderByChild('recordNum'))).then(recordsSnap=>{
                    recordsSnap.forEach(record=>{
                        console.log(record.val())
                        document.getElementById("victors-container").innerHTML +=
                    `
                    <a href="${record.val().video}"><h2 class="victor">${record.val().name}</h2></a>
                    `
                    })
                })
            }
        }
    })
})
