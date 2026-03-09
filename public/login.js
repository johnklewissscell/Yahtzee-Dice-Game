// login.js
import { auth, provider } from "./api.js";
import { signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.querySelector("button[type='submit']").addEventListener("click", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      alert(`Logged in as ${userCredential.user.email}`);
      window.location.href = "lobby.html";
    })
    .catch((error) => {
      alert(error.message);
    });
});

document.querySelector(".google-btn").addEventListener("click", () => {
  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      alert(`Logged in as ${user.displayName}`);
      window.location.href = "lobby.html"; // redirect to game/lobby
    })
    .catch((error) => {
      console.error(error);
      alert(error.message);
    });
});