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
      const user = userCredential.user;
      const defaultName = user.displayName || user.email.split("@")[0];
      sessionStorage.setItem("defaultPlayerName", defaultName);
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
      const defaultName = user.displayName || user.email.split("@")[0];
      sessionStorage.setItem("defaultPlayerName", defaultName);
      window.location.href = "lobby.html";
    })
    .catch((error) => {
      console.error(error);
      alert(error.message);
    });
});