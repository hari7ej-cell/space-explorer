/* Static mission catalogue only. Cards intentionally have no click action. */
/* Keep this file beside the "mission-images" folder. */

const missionGroups = [
  {
    name: 'ISRO',
    note: 'INDIA — INDIAN SPACE RESEARCH ORGANISATION',
    missions: [
      { title: 'Chandrayaan-1', year: '2008', type: 'Lunar Orbiter', description: 'India’s first lunar mission helped confirm the presence of water molecules on the Moon.', image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1000&q=85' },
      { title: 'Mars Orbiter Mission', year: '2013', type: 'Mars Exploration', description: 'Mangalyaan made India the first country to reach Mars orbit on its first attempt.', image: 'mission-images/mars-orbiter-mission.jpg' },
      { title: 'AstroSat', year: '2015', type: 'Space Observatory', description: 'India’s first dedicated multi-wavelength space astronomy observatory.', image: 'mission-images/astrosat.jpg' },
      { title: 'Chandrayaan-2', year: '2019', type: 'Lunar Exploration', description: 'An orbiter, lander and rover mission designed to study the Moon’s south polar region.', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=85' },
      { title: 'Chandrayaan-3', year: '2023', type: 'Lunar Landing', description: 'Achieved a successful soft landing near the Moon’s south polar region.', image: 'mission-images/chandrayaan-3.jpg' },
      { title: 'Aditya-L1', year: '2023', type: 'Solar Observatory', description: 'India’s first space-based mission dedicated to studying the Sun.', image: 'mission-images/aditya-l1.jpg' }
    ]
  },
  {
    name: 'NASA',
    note: 'UNITED STATES — NATIONAL AERONAUTICS AND SPACE ADMINISTRATION',
    missions: [
      { title: 'Apollo 11', year: '1969', type: 'Lunar Landing', description: 'The first crewed mission to land humans on the Moon and return them safely to Earth.', image: 'mission-images/apollo-11.jpg' },
      { title: 'Voyager 1', year: '1977', type: 'Deep Space Probe', description: 'A robotic explorer that continues its journey through interstellar space.', image: 'mission-images/voyager-1.jpg' },
      { title: 'Hubble Space Telescope', year: '1990', type: 'Space Telescope', description: 'A landmark observatory that transformed our view of galaxies and the distant universe.', image: 'mission-images/hubble-space-telescope.webp' },
      { title: 'Perseverance', year: '2020', type: 'Mars Rover', description: 'Explores Jezero Crater and searches for signs of ancient microbial life on Mars.', image: 'mission-images/perseverance.png' },
      { title: 'James Webb Space Telescope', year: '2021', type: 'Space Telescope', description: 'Observes the early universe, distant exoplanets and the birth of stars.', image: 'mission-images/james-webb-space-telescope.png' },
      { title: 'Artemis I', year: '2022', type: 'Lunar Test Flight', description: 'An uncrewed flight test of the Space Launch System rocket and Orion spacecraft.', image: 'mission-images/artemis1.jpg' }
    ]
  },
  {
    name: 'OTHERS',
    note: 'GLOBAL EXPLORATION — MISSIONS FROM OTHER SPACE AGENCIES',
    missions: [
      { title: 'Rosetta', year: '2004', type: 'Comet Exploration · ESA', description: 'The European Space Agency mission that studied comet 67P up close and delivered a lander.', image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=1000&q=85' },
      { title: 'Hayabusa2', year: '2014', type: 'Asteroid Sample · JAXA', description: 'Japan’s spacecraft collected samples from asteroid Ryugu and brought them back to Earth.', image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1000&q=85' },
      { title: 'Tianwen-1', year: '2020', type: 'Mars Exploration · CNSA', description: 'China’s first independent Mars mission, including an orbiter, lander and rover.', image: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&w=1000&q=85' }
    ]
  }
];

const container = document.getElementById('mission-sections');

missionGroups.forEach((group, groupIndex) => {
  const section = document.createElement('section');
  section.className = 'mission-group';
  section.setAttribute('aria-labelledby', `mission-group-${groupIndex}`);

  const heading = document.createElement('div');
  heading.className = 'group-heading';
  heading.innerHTML = `<h3 id="mission-group-${groupIndex}">${group.name}</h3><p>${group.note}</p>`;

  const grid = document.createElement('div');
  grid.className = 'mission-grid';

  group.missions.forEach((mission, missionIndex) => {
    const card = document.createElement('article');
    card.className = 'mission-card';
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
