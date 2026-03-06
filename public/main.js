// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
