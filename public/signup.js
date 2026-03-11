import { db, auth, provider } from "./api.js";
import { createUserWithEmailAndPassword, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Email/Password Signup
document.querySelector("button[type='submit']").addEventListener("click", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim().toLowerCase();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !email || !password) {
    alert("Fill all fields.");
    return;
  }

  try {

    // check if username exists
    const usernameRef = doc(db, "usernames", username);
    const usernameSnap = await getDoc(usernameRef);

    if (usernameSnap.exists()) {
      alert("Username already taken.");
      return;
    }

    // create account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // store user data
    await setDoc(doc(db, "users", user.uid), {
      username: username,
      email: user.email,
      wins: 0,
      gamesPlayed: 0,
      createdAt: serverTimestamp()
    });

    // reserve username
    await setDoc(usernameRef, {
      uid: user.uid
    });

    alert(`Welcome ${username}`);
    window.location.href = "lobby.html";

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});

// Google Signup/Login
document.querySelector(".google-btn").addEventListener("click", () => {
  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      alert(`Logged in as ${user.displayName}`);
      window.location.href = "lobby.html";
    })
    .catch((error) => {
      console.error(error);
      alert(error.message);
    });
});