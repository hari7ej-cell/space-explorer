# Space Explorer

A website for people curious about space. It puts planets, missions, astronauts, images and space news in one place, so you don't have to hop between a dozen sites. Data comes from Wikipedia, NASA and a few other public sources.

The backend is Node/Express, the frontend is plain HTML/CSS/JS, login goes through Supabase, and the planet data model is written in C++ (OOP part of the project).

## What you need

- Node.js 20.18 or newer (check with `node -v`)
- A Supabase project (we use it for login)
- g++, only on Mac/Linux. Windows uses the `space_model.exe` that's already in the repo.
- Internet connection, since the pages pull live data

## Running it

1. Clone the repo and go into the backend folder:
   ```
   git clone https://github.com/hari7ej-cell/space-explorer.git
   cd space-explorer/backend
   ```
2. Make your `.env` file. Copy `.env.example` to `.env` (`copy .env.example .env` on Windows, `cp .env.example .env` on Mac/Linux) and fill in the three values from your Supabase project:
   ```
   SUPABASE_URL=
   SUPABASE_PUBLISHABLE_KEY=
   SUPABASE_SECRET_KEY=
   ```
   Never commit this file. It's in `.gitignore`.
3. Install packages (first time only):
   ```
   npm.cmd install
   ```
4. Start the server:
   ```
   node server.js
   ```
5. Open http://localhost:3000. You'll land on the login page.

Port 3000 is hard-coded, so close anything else using it.

## The C++ part

The repo includes a built `cpp/bin/space_model.exe` for Windows, so on Windows you don't need to do anything.

On Mac/Linux that file won't run, so build it once from the project root:
```
g++ -std=c++17 -O2 -o cpp/bin/space_model.exe cpp/SpaceExplorer.cpp
```
On a Mac, install the compiler first with `xcode-select --install`. On Linux, `sudo apt install g++`. The output is called `.exe` on every OS, that's fine. Don't commit the Mac/Linux build; if git shows it as changed, run `git restore cpp/bin/space_model.exe`.

When the server starts it also checks whether the `.exe` is older than `cpp/SpaceExplorer.cpp` and tries to rebuild with g++. If g++ isn't installed it just warns and keeps the existing file.

## Folders

- `Frontend/` the pages (login, home, planets, planet detail, missions, astronauts, error). `site.css` and `site.js` give every page the same header and footer, and `auth.js` handles the login check.
- `backend/` the Express server. `routes/` has login, astronauts, home data and error pages. `services/` talks to Wikipedia, NASA, news and the C++ program.
- `cpp/` the object model: SpaceEntity, Planet, Mission, Astronaut and friends.
- `docs/` CRC cards, noun analysis, use cases and the UML diagrams.

## How login works

1. `login.html` sends the username/email and password to `/api/login`.
2. The server looks the username up in the Supabase `profiles` table and signs the user in with Supabase. It sends back the session tokens.
3. The page stores them with `supabase.auth.setSession` and opens `index.html`.
4. Every other page loads `auth.js`, which asks Supabase for the saved session. No session, and you're sent back to the login page. If there is one, the header says "Hello, <username>".
5. Log out calls `supabase.auth.signOut()` and goes back to the login page.

## If something breaks

- **`npm install` blocked on Windows** ("running scripts is disabled"): use `npm.cmd install`, use Command Prompt instead of PowerShell, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` in PowerShell.
- **Pages show 404 on Mac/Linux:** folder names are case sensitive there. It should be `Frontend` with a capital F and `backend` all lowercase.
- **Login fails:** check that `backend/.env` exists and the three Supabase values are right.
- **"C++ executable was not found" or the exe won't run:** build it with the g++ command above.