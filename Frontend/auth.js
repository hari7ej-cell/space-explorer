/* =========================================
   LOGIN CHECK (loaded by site.js on every page except login.html)
   - no saved session  -> go to the login page
   - saved session     -> show the person's name in the header and reveal the page
   - "Log out" buttons -> end the session and go back to the login page
========================================= */
import { supabase } from "./supabaseClient.js";

const goToLogin = () => window.location.replace("login.html");

export let signedIn = false;   // pages that call the API wait for this (see site.js)

try {
    // Supabase keeps the session in this browser and renews it when it runs out.
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        goToLogin();
    } else {
        const user = session.user;
        const name = user.user_metadata?.username || (user.email || "Explorer").split("@")[0];

        document.querySelector(".account-greeting").textContent = "Hello, " + name;
        document.querySelector(".account-email-value").textContent = user.email || "";
        document.documentElement.classList.add("signed-in");   // shows the page (see site.css)
        signedIn = true;
    }
} catch (error) {
    console.error("Could not check the login:", error);
    goToLogin();
}

document.addEventListener("click", async event => {
    if (!event.target.closest("[data-logout]")) return;
    event.preventDefault();
    await supabase.auth.signOut();
    goToLogin();
});
