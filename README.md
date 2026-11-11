# Space Explorer

## Run it
1. Install Node.js 20.18 or newer (and g++ so the C++ model can be built).
2. In `backend`, copy `.env.example` to `.env` and fill in the three Supabase values.
3. In `backend` run `npm install` (once), then `node server.js`.
4. Open http://localhost:3000. You land on the login page.

The first start compiles `cpp/SpaceExplorer.cpp` into `cpp/bin/space_model.exe` when g++ is available.
To build it by hand: `g++ -std=c++17 -O2 -o cpp/bin/space_model.exe cpp/SpaceExplorer.cpp`

## Folders
- `frontend/`  pages (`login`, `index`, `planets`, `planet-detail`, `missions`, `astronauts`, `error`).
  `site.css` and `site.js` give every page the same header, footer and login check.
- `backend/`   Express server. `routes/` has login, astronauts, home data and error handling;
  `services/` has Wikipedia, NASA, news, Wikidata and the C++ bridge.
- `cpp/`       the object model (SpaceEntity, Planet, Mission, Astronaut, ...).

## How login works
1. `login.html` asks for a username or email and a password and posts them to `/api/login`.
2. The server looks the username up in the Supabase `profiles` table, signs the person in with
   Supabase and returns the session tokens.
3. The page saves the tokens in the browser with `supabase.auth.setSession` and opens `index.html`.
4. Every other page loads `auth.js`, which asks Supabase for the saved session. No session means
   the page goes back to `login.html`; a session shows "Hello, <username>" in the header.
5. "Log out" calls `supabase.auth.signOut()` and returns to `login.html`.
