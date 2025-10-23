# Epic Adventure — Web Port (WIP)

A browser-based port of my work-in-progress, text-only Python adventure game — now with a minimal UI, buttons & text input, and a cleaner combat loop that mirrors the Python design.

> Original Python project (for context & parity tracking):
> **Epic-Adventure** — [https://github.com/stevenfarless/Epic-Adventure](https://github.com/stevenfarless/Epic-Adventure)

---

## What’s inside

* **100% client-side**: vanilla HTML/CSS/JS, no build step required.
* **Faithful port of game logic** from Python: difficulty presets, enemy aggression, damage variance, victory rewards, and the infamous “Marcus + Rock” encounter.
* **Simple, readable code** designed for extending encounters and tuning balance.
* **Accessible UI**: ARIA live region for story text, keyboard-friendly inputs.

```
/
├─ index.html      # App shell and UI
├─ style.css       # Styling (keeps your original vibe, tightened)
└─ script.js       # Full JS port of the new Python game
```

---

## How to play

1. **Open `index.html` in a modern browser**
2. Choose a **difficulty** (Easy / Medium / Hard).
3. Enter your **name**. (Try the name of a certain TikTok famous worm character for a fun easter egg.)
4. From the crossroads, **pick a direction** and survive the fights using:

   * `Attack` — deals damage; enemy may attack or defend
   * `Defend` — mitigates damage and may counter

Winning grants **health + attack rewards** and levels you up. Defeat ends the run (with some flavor text).

---

## Parity with Python (Design Notes)

This port mirrors the Python game’s structure:

* **Difficulty Settings**: player stat baselines, enemy multipliers, and post-battle rewards.
* **Encounters**: a simple config object (`BASE_ENCOUNTERS`) defining intro/victory/defeat text, stats, and aggression.
* **Enemy AI**: weighted “attack vs defend” choice sensitive to remaining HP.
* **Damage Model**: variable damage band, minimum chip damage, and block/counter behavior.
* **Progression**: post-battle recovery + attack increment, `level` increments.
* **Easter egg**: `name === "marcus"` unlocks the Rock at the campfire.

> For deeper narrative/logic context, see the Python repo:
> [https://github.com/stevenfarless/Epic-Adventure](https://github.com/stevenfarless/Epic-Adventure)

---

## Extending the game

### Add a new encounter

Open `script.js` and append a new config under `BASE_ENCOUNTERS`:

```js
BASE_ENCOUNTERS.northeast = {
  name: "Wraith",
  base_health: 80,
  base_attack: 20,
  base_defense: 4,
  aggression: 70,
  crossroad_description: "To the North-East:\tCold mist coils over an old grave road.",
  intro_text: "\n\tA chill pools at your feet as whispers rise from the stones...",
  victory_text: "The wraith dissolves like frost in sunlight. You press on.\n",
  defeat_text: "Your warmth gutters out; the mist keeps what it takes.\n",
};
```

> The game auto-lists directions from the keys of `BASE_ENCOUNTERS` (plus the campfire encounter when `name === "marcus"`). No extra wiring needed.

### Tweak difficulty

Adjust `DIFFICULTY_SETTINGS` for player baselines, enemy multipliers, and rewards:

```js
const DIFFICULTY_SETTINGS = {
  medium: {
    player: { health: 100, attack: 15, defense: 5 },
    enemy:  { health_multiplier: 1.0, attack_multiplier: 1.0, defense_multiplier: 1.0 },
    rewards:{ health: 15, attack: 2 }
  },
  // ...
};
```

---

## UI & Accessibility

* **`#game-text`** is an ARIA live region so new lines are announced by screen readers.
* **Buttons** for common choices; **text input** enables free text (name input).
* **Keyboard support**: Type + **Enter** to submit; buttons are focusable and clickable via keyboard.

---

## Roadmap (short list)

* [ ] Save/load runs (localStorage)
* [ ] Mobile tuning (font & layout tweaks)
* [ ] Encounter scripting helpers (status effects, items, skills)
* [ ] Sound & subtle animations
* [ ] Optional “story mode” with fewer deaths, more narrative

---

## Contributing

PRs welcome! For bigger changes (combat formulas, encounter schema), please open an issue first in the original Python version so we can keep parity in mind.

**Basic guidelines:**

* Keep functions small and testable.
* Prefer data-driven patterns (encounter config over one-off logic).
* Preserve accessibility attributes in the UI.
