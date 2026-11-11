import { supabase } from "./supabaseClient.js";

// Someone who is already logged in does not need this page.
const { data: { session } } = await supabase.auth.getSession();
if (session) window.location.replace("index.html");

/* =========================================================
   LOGIN UI + SUPABASE SIGN UP
========================================================= */

const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const signupLink = document.getElementById("signupLink");
const backToLogin = document.getElementById("backToLogin");

const googleButton = document.getElementById("googleButton");
const authMessage = document.getElementById("authMessage");

const usernameInput = document.getElementById("username");
const loginPasswordInput = document.getElementById("password");

const signupUsername = document.getElementById("signupUsername");
const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");

/* ---------- Password Toggle ---------- */

if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener("click", () => {

        const isPassword = passwordInput.type === "password";

        passwordInput.type = isPassword ? "text" : "password";

        passwordToggle.setAttribute(
            "aria-label",
            isPassword ? "Hide password" : "Show password"
        );
    });
}

/* ---------- Switch Between Forms ---------- */

signupLink?.addEventListener("click", (event) => {

    event.preventDefault();

    loginForm.hidden = true;
    signupForm.hidden = false;

    authMessage.textContent = "";
});

backToLogin?.addEventListener("click", (event) => {

    event.preventDefault();

    signupForm.hidden = true;
    loginForm.hidden = false;

    authMessage.textContent = "";
});

/* ---------- Sign Up ---------- */

signupForm?.addEventListener("submit", async (event) => {

    event.preventDefault();

    authMessage.textContent = "Creating account...";

    const { error } = await supabase.auth.signUp({

        email: signupEmail.value.trim(),

        password: signupPassword.value,

        options: {

            data: {
                username: signupUsername.value.trim()
            }
        }
    });

    if (error) {

        authMessage.textContent = error.message;
        return;
    }

    authMessage.textContent =
        "Account created! Check your email to verify your account.";

    signupForm.reset();

    signupForm.hidden = true;
    loginForm.hidden = false;
});

/* ---------- Login via Backend ---------- */

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    authMessage.textContent = "Signing in...";

    const identifier = usernameInput.value.trim();
    const password = loginPasswordInput.value;

    try {
        const response = await fetch(SpaceSearch.API_BASE + "/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                identifier,
                password
            })
        });

        const result = await response.json();

        if (!response.ok) {
            authMessage.textContent =
                result.error || "Login failed. Please try again.";
            return;
        }

        const { error } = await supabase.auth.setSession({
            access_token: result.access_token,
            refresh_token: result.refresh_token
        });

        if (error) {
            authMessage.textContent =
                "Login succeeded, but the session could not be saved. Please try again.";
            console.error("Session error:", error.message);
            return;
        }

        authMessage.textContent = "Login successful! Welcome back.";
        loginForm.reset();
        window.location.replace("index.html");

    } catch (error) {
        console.error("Login request failed:", error);
        authMessage.textContent =
            "Cannot connect to the backend. Please check that the server is running.";
    }
});

/* ---------- Google Button (later) ---------- */

googleButton?.addEventListener("click", () => {

    console.log("Google login will be connected later.");
});
