/* Encounter selection menu. Reads window.EncounterMeta and builds cards. */
(function () {
  'use strict';
  const grid       = document.getElementById('menu-grid');
  const menuStatus = document.getElementById('menu-status');

  // Order matches the original encounters.html grid.
  const ORDER = [
    'charlock', 'dark_one', 'goblin', 'heroic_dragon', 'pixie',
    'silver_dragon', 'unicorn', 'ursa', 'winterra', 'xavier',
  ];

  function build() {
    if (!grid) return;
    grid.innerHTML = '';
    ORDER.forEach((id) => {
      const enc = window.Encounters[id];
      const meta = enc && enc.meta;
      if (!meta) return;
      const card = document.createElement('div');
      card.className = 'encounter-card' + (meta.disabled ? ' disabled' : '');
      card.tabIndex = 0;
      card.innerHTML =
        '<img src="' + meta.image + '" alt="' + meta.name + '">' +
        '<div class="name">' + meta.name + '</div>' +
        (meta.badge ? '<div class="badge">' + meta.badge + '</div>' : '');
      if (!meta.disabled) {
        card.addEventListener('click', () => window.Engine.showGame(id));
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            window.Engine.showGame(id);
          }
        });
      }
      grid.appendChild(card);
    });
    if (menuStatus) menuStatus.textContent = 'select an encounter';
  }

  // Bootstrap once all encounter modules have registered.
  document.addEventListener('DOMContentLoaded', () => {
    build();
    window.Engine.showMenu();
  });

  // Allow Menu button (added in game screen) to return.
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'menu-btn') {
      window.Engine.showMenu();
    }
  });
})();
