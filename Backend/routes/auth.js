// Login. The browser sends a username or email plus a password; the server checks them
// with Supabase (the online database) and returns the session tokens.
const express = require("express");
const rateLimit = require("express-rate-limit");
const { createClient } = require("@supabase/supabase-js");

const router = express.Router();

const requiredEnv = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"];
const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length) {
    console.warn(`Login is turned off. Add ${missingEnv.join(", ")} to backend/.env and restart.`);
}

const serverAuth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

// "adminClient" may look users up by username, "authClient" signs them in.
const adminClient = missingEnv.length ? null : createClient(
    process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: serverAuth });
const authClient = missingEnv.length ? null : createClient(
    process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, { auth: serverAuth });

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts. Please try again later." }
});

const invalidLogin = res => res.status(401).json({ error: "Invalid username/email or password." });

router.post("/api/login", express.json({ limit: "10kb" }), loginLimiter, async (req, res) => {
    if (!authClient) {
        return res.status(503).json({ error: "Login is not set up on the server yet." });
    }

    try {
        const identifier = req.body?.identifier?.trim();
        const password = req.body?.password;

        if (
            typeof identifier !== "string" ||
            typeof password !== "string" ||
            !identifier ||
            !password ||
            identifier.length > 254 ||
            password.length > 128
        ) {
            return res.status(400).json({ error: "Please enter a valid username/email and password." });
        }

        let email = identifier;

        // A username is turned into the account's email first.
        if (!identifier.includes("@")) {
            const { data: profile, error: profileError } = await adminClient
                .from("profiles")
                .select("id")
                .eq("username", identifier)
                .maybeSingle();

            if (profileError || !profile) return invalidLogin(res);

            const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(profile.id);

            if (userError || !userData.user?.email) return invalidLogin(res);

            email = userData.user.email;
        }

        const { data, error } = await authClient.auth.signInWithPassword({ email, password });

        if (error || !data.session) return invalidLogin(res);

        return res.json({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_in: data.session.expires_in,
            token_type: data.session.token_type
        });
    } catch (error) {
        console.error("Login request failed:", error.message);
        return res.status(500).json({ error: "Something went wrong. Please try again." });
    }
});

module.exports = router;
