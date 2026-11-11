/* Builds the mission cards on missions.html from missionData.js. */

const container = document.getElementById('mission-sections');

MISSION_GROUPS.forEach((group, groupIndex) => {
  const section = document.createElement('section');
  section.className = 'mission-group';
  section.setAttribute('aria-labelledby', `mission-group-${groupIndex}`);

  const heading = document.createElement('div');
  heading.className = 'group-heading';
  heading.innerHTML = `<h3 id="mission-group-${groupIndex}">${group.name}</h3><p>${group.note}</p>`;

  const grid = document.createElement('div');
  grid.className = 'mission-grid';

  group.missions.forEach((mission, missionIndex) => {
    const card = document.createElement('a');
    card.className = 'mission-card';
    card.href = missionDetailUrl(mission);
    const number = String(missionIndex + 1).padStart(2, '0');
    card.innerHTML = `
      <div class="mission-image">
        <img src="${mission.image}" alt="${mission.title}" loading="lazy">
        <span class="mission-number">MISSION ${number}</span>
      </div>
      <div class="mission-copy">
        <div class="mission-meta"><span>${mission.type}</span><span class="mission-year">${mission.year}</span></div>
        <h4>${mission.title}</h4>
        <p>${mission.description}</p>
      </div>`;
    grid.appendChild(card);
  });

  section.append(heading, grid);
  container.appendChild(section);
});
