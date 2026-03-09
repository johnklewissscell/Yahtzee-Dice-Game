import { db, auth, provider } from "./api.js";
import { createUserWithEmailAndPassword, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Email/Password Signup
document.querySelector("button[type='submit']").addEventListener("click", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      username: username,
      email: user.email,
      createdAt: serverTimestamp(),
      wins: 0,
      gamesPlayed: 0
    });

    alert(`Account created! Welcome ${username}`);
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