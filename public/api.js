// api.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; 

const firebaseConfig = {
  apiKey: "AIzaSyB2c3iRRqzuGfReQ84sDQGwjrn2QumefNE",
  authDomain: "yahtzee-onlinegame.firebaseapp.com",
  databaseURL: "https://yahtzee-onlinegame-default-rtdb.firebaseio.com",
  projectId: "yahtzee-onlinegame",
  storageBucket: "yahtzee-onlinegame.firebasestorage.app",
  messagingSenderId: "723861302840",
  appId: "1:723861302840:web:f5603aac4b931f348d00cd",
  measurementId: "G-9RSG0HRQZK",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const dbd = getFirestore(app);

export { db, auth, provider, dbd };