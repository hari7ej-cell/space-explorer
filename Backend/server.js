
import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = process.env.PORT || 3000;

const requiredEnv = [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY"
];

for (const key of requiredEnv) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

app.use(cors({
    origin: "http://127.0.0.1:5500"
}));

app.use(express.json({ limit: "10kb" }));

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many login attempts. Please try again later."
    }
});

const adminClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    }
);

const authClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    }
);

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.post("/api/login", loginLimiter, async (req, res) => {
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
            return res.status(400).json({
                error: "Please enter a valid username/email and password."
            });
        }

        let email = identifier;

        if (!identifier.includes("@")) {
            const { data: profile, error: profileError } =
                await adminClient
                    .from("profiles")
                    .select("id")
                    .eq("username", identifier)
                    .maybeSingle();

            if (profileError || !profile) {
                return res.status(401).json({
                    error: "Invalid username/email or password."
                });
            }

            const { data: userData, error: userError } =
                await adminClient.auth.admin.getUserById(profile.id);

            if (userError || !userData.user?.email) {
                return res.status(401).json({
                    error: "Invalid username/email or password."
                });
            }

            email = userData.user.email;
        }

        const { data, error } =
            await authClient.auth.signInWithPassword({
                email,
                password
            });

        if (error || !data.session) {
            return res.status(401).json({
                error: "Invalid username/email or password."
            });
        }

        return res.json({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_in: data.session.expires_in,
            token_type: data.session.token_type
        });
    } catch (error) {
        console.error("Login request failed:", error.message);

        return res.status(500).json({
            error: "Something went wrong. Please try again."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Space Explorer backend running at http://localhost:${PORT}`);
});