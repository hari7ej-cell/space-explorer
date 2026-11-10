SPACE EXPLORER — MISSIONS PAGE REDESIGN

FILES
- missions.html : standalone preview page (no header or footer)
- missions.css  : dark navy visual design, hero, responsive mission cards
- missions.js   : static ISRO, NASA and other mission card content

PREVIEW
1. Keep all three files in the same folder.
2. Open missions.html in a browser, or run it through VS Code Live Server.

INTEGRATING WITH YOUR TEAM PROJECT
- The HTML intentionally contains no header or footer markup.
- Copy the <main class="missions-page"> ... </main> block from missions.html into the existing page, after your team's header.
- Add <link rel="stylesheet" href="missions.css"> in the existing page's <head>.
- Add <script src="missions.js"></script> just before the closing body tag.
- Your teammates can append their footer after the main block.
- If your project uses a different folder structure, update the CSS/JS paths accordingly.

NOTES
- Mission cards are display-only: no click handlers, links, search bar, or detail-page behavior are included.
- The hero uses NASA's official Artemis II Earth-from-Orion image (NASA image ID art002e000192) as a remote background image. An internet connection is needed to load it. If the NASA asset URL changes, replace the URL in missions.css.
- Mission-card photographs are remote illustrative images and also need an internet connection.
- The header and footer are deliberately excluded so they can be integrated by your teammates.
