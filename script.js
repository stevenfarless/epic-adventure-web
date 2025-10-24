// ---------------- Constants & Settings ----------------

const MAX_HEALTH = 100;
const PLAYER_BASE_ATTACK = 15;
const PLAYER_BASE_DEFENSE = 5;

const DIFFICULTY_SETTINGS = {
  easy: {
    player: {
      health: MAX_HEALTH + 30,
      attack: PLAYER_BASE_ATTACK + 5,
      defense: PLAYER_BASE_DEFENSE + 3,
    },
    enemy: {
      health_multiplier: 0.7,
      attack_multiplier: 0.75,
      defense_multiplier: 0.7,
    },
    rewards: { health: 25, attack: 3 },
  },
  medium: {
    player: {
      health: MAX_HEALTH,
      attack: PLAYER_BASE_ATTACK,
      defense: PLAYER_BASE_DEFENSE,
    },
    enemy: {
      health_multiplier: 1.0,
      attack_multiplier: 1.0,
      defense_multiplier: 1.0,
    },
    rewards: { health: 15, attack: 2 },
  },
  hard: {
    player: {
      health: MAX_HEALTH - 20,
      attack: PLAYER_BASE_ATTACK - 3,
      defense: PLAYER_BASE_DEFENSE - 2,
    },
    enemy: {
      health_multiplier: 1.4,
      attack_multiplier: 1.3,
      defense_multiplier: 1.3,
    },
    rewards: { health: 10, attack: 1 },
  },
};

// ---------------- UI Helpers ----------------

const $text = () => document.getElementById("game-text");
const $input = () => document.getElementById("text-input");
const $buttons = () => document.getElementById("button-container");

function clearScreen() {
  $text().textContent = "";
}

function printLine(text) {
  const el = $text();
  el.textContent += text + "\n";
  el.scrollTop = el.scrollHeight;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedChoice(choices, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < choices.length; i++) {
    r -= weights[i];
    if (r <= 0) return choices[i];
  }
  return choices[choices.length - 1];
}

// ---------------- Input Handling ----------------

const gameState = {
  waiting: false,
  resolver: null,
  valid: [],
  useText: false,
};

function showButtons(options) {
  const container = $buttons();
  container.innerHTML = "";
  options.forEach((opt) => {
    const b = document.createElement("button");
    b.textContent = opt[0].toUpperCase() + opt.slice(1);
    b.addEventListener("click", () => resolveInput(opt));
    container.appendChild(b);
  });
}

function getUserInput(prompt, validInputs = [], useText = false) {
  return new Promise((resolve) => {
    if (prompt) printLine(prompt);
    gameState.waiting = true;
    gameState.resolver = resolve;
    gameState.valid = validInputs;
    gameState.useText = useText;

    const input = $input();
    const container = $buttons();
    container.innerHTML = "";

    if (useText || validInputs.length === 0) {
      input.classList.remove("hidden");
      input.focus();
    } else {
      input.classList.add("hidden");
      showButtons(validInputs);
    }
  });
}

function resolveInput(value) {
  if (!gameState.waiting) return;
  gameState.waiting = false;
  const res = gameState.resolver;
  gameState.resolver = null;
  $buttons().innerHTML = "";
  $input().classList.add("hidden");
  $input().value = "";
  res(value.toLowerCase());
}

function handleTextEnter() {
  if (!gameState.waiting) return;
  const value = $input().value.trim();
  if (!value) return;
  const lower = value.toLowerCase();

  if (gameState.valid.length && !gameState.valid.includes(lower)) {
    printLine("Invalid input. Please try again.");
    $input().value = "";
    return;
  }

  resolveInput(lower);
}

document.getElementById("text-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleTextEnter();
});

async function validateInput(prompt, valid) {
  while (true) {
    const ans = await getUserInput(prompt, valid);
    if (valid.includes(ans)) return ans;
    printLine("Invalid input. Please try again.");
  }
}

// ---------------- Data Models ----------------

class Player {
  constructor(name, difficulty) {
    this.name = name;
    this.difficulty = difficulty;
    const stats = DIFFICULTY_SETTINGS[difficulty].player;
    this.health = Math.trunc(stats.health);
    this.attack = Math.trunc(stats.attack);
    this.defense = Math.trunc(stats.defense);
    this.max_health = this.health;
    this.level = 1;
  }
}

class Enemy {
  constructor({ name, max_health, attack, defense, aggression }) {
    this.name = name;
    this.max_health = max_health;
    this.attack = attack;
    this.defense = defense;
    this.aggression = aggression;
  }

  static fromConfig(config, difficulty) {
    const m = DIFFICULTY_SETTINGS[difficulty].enemy;
    return new Enemy({
      name: config.name,
      max_health: Math.trunc(config.base_health * m.health_multiplier),
      attack: Math.trunc(config.base_attack * m.attack_multiplier),
      defense: Math.trunc(config.base_defense * m.defense_multiplier),
      aggression: config.aggression,
    });
  }
}

// ---------------- Encounter Configs ----------------

const BASE_ENCOUNTERS = {
  north: {
    name: "Bear",
    base_health: 50,
    base_attack: 15,
    base_defense: 3,
    aggression: 75,
    crossroad_description:
      "To the North:\tYou see a dense forest stretching as far as the eye can see.",
    intro_text:
      "\n\tYou enter the dense forest.\n" +
      "The air is thick with the scent of pine and damp earth.\n" +
      "As you walk deeper, you hear rustling in the bushes.\n" +
      "You try to ignore it and decide to keep walking. \n" +
      "Before you can take another step, out lunges a wild bear!\n" +
      "It's hungry as heck and you look delicious!\n",
    victory_text:
      "Feeling triumphant after defeating the bear, you continue your journey.\n",
    defeat_text:
      "The bear's attack overwhelms you.\n" +
      "You hear the bear say a prayer, thanking his bear deity for this delicious feast.\n",
    defeat_followup_prompt: "[Press ENTER to say 'Amen' with the bear]",
    defeat_followup_text: "You can't talk. The bear ripped your throat out.\n\tBummer.",
  },
  east: {
    name: "Bandit Leader",
    base_health: 70,
    base_attack: 18,
    base_defense: 5,
    aggression: 60,
    crossroad_description:
      "To the East:\tYou see smoke rising from a distant village.",
    intro_text:
      "\n\tAs you head towards the distant village,\n" +
      "following the trail of smoke, you notice something alarming:\n" +
      "the village is under attack by a group of bandits!\n" +
      "\tTheir leader gestures to his gang, and they quickly encircle you both.\n" +
      "Their chants of 'FIGHT! FIGHT! FIGHT!' echo through the air.",
    victory_text:
      "With the bandit leader defeated, the villagers thank you and you continue your journey.\n",
    defeat_text:
      "The bandit leader lands his final blow. The bandits fight over who gets to keep your sweet loot.\n" +
      "You try to get up and retreat, but the bandits stole your feet.",
  },
  south: {
    name: "Cave Troll",
    base_health: 90,
    base_attack: 22,
    base_defense: 8,
    aggression: 85,
    crossroad_description:
      "To the South:\tYou see a mysterious cave entrance beckoning with an eerie glow.",
    intro_text:
      "\n\tYou enter the mysterious cave.\n" +
      "The air is cool and damp, with faint echoes bouncing off the walls.\n" +
      "As you venture deeper, you notice glowing crystals illuminating the path.\n" +
      "You start to feel uneasy, so you turn around to leave.\n" +
      "You turn and find yourself face to face with a troll!\n" +
      "\t'Your bones will make a great addition to my collection!'",
    victory_text:
      "The defeated troll slumps to the ground, allowing you to proceed deeper into the cave.\n",
    defeat_text:
      "The troll's brute strength overwhelms you.\n" +
      "You attempt to retreat from the cave to die in peace, but you are trapped.\n\n" +
      "Your bones join the pile of hundreds of other stupid...\nI mean...\nbrave...\nadventurers.",
  },
  west: {
    name: "Dragon",
    base_health: 150,
    base_attack: 28,
    base_defense: 10,
    aggression: 50,
    crossroad_description:
      "To the West:\tYou see a narrow path leading up a steep mountain.",
    intro_text:
      "\n\tYou start your ascent up the steep mountain path.\n" +
      "The higher you climb, the more breathtaking the view becomes.\n" +
      "After a challenging climb, you reach a serene mountaintop lake.\n" +
      "\tThe air grows suddenly cold.\n" +
      "The wind picks up, carrying a bone-chilling roar that echoes through the peaks.\n" +
      "Your heart pounds as a colossal shadow blots out the sun.\n" +
      "With a thunderous crash, a dragon descends from the swirling clouds,\n" +
      "its scales gleaming ominously. Its piercing eyes lock onto you,\n" +
      "and its wings cast a dark shadow over the lake.\n" +
      "The ground trembles beneath its massive claws as it emits a low, rumbling growl.\n\n" +
      "You ready your weapon",
    victory_text:
      "Filled with adrenaline from defeating the dragon, you continue your journey.\n",
    defeat_text:
      "The dragon's fire leaves you badly burned. You retreat from the mountain to die in peace.\n",
  },
};

const MARCUS_ROCK_ENCOUNTER = {
  name: "Rock",
  base_health: 500,
  base_attack: 0,
  base_defense: 0,
  aggression: 0,
  crossroad_description:
    "To the Campfire:\tYou see a cozy campfire with your best friend Robert.",
  intro_text:
    "\n\tYou are sitting around a campfire, just living your best wormy acetomenotistic life with your best friend Robert. " +
    "You notice something is off but you can't put your freakishly long finger on it. After a brief moment of hypervigilance, " +
    "something catches your big ol' eye. There's something about that rock. That rock right there. It's... It's... IT'S PISSING YOU OFF! " +
    "You tell Robert but he is of little help. You are left with no other choice than to give that stupid smug little stupid smug rock a piece of your mind.\n",
  victory_text:
    "The rock crumbles into dust.\nRobert looks at you with concern.\n'You okay, buddy?' he asks.\nYou feel strangely satisfied.\n",
  defeat_text:
    "You somehow died fighting a rock.\nA ROCK.\nRobert will never let you live this down.\n...Oh wait, you're dead.\n",
};

const ROBERT_CAMPFIRE_ENCOUNTER = {
  name: "Marcus's Sanity",
  base_health: 1,
  base_attack: 0,
  base_defense: 0,
  aggression: 0,
  crossroad_description:
    "To the Campfire:\tYou see a cozy campfire with your best friend Marcus.",
  intro_text:
    "\n\tYou're relaxing by a warm campfire with your best friend Marcus, roasting marshmallows and enjoying the peaceful evening. " +
    "The stars twinkle overhead, the fire crackles gently... it's perfect.\n\n" +
    "\tThen Marcus stands up.\n\n" +
    "He walks over to a nearby rock. A perfectly innocent rock. Without a word, without warning, " +
    '\"Robert...\" Marcus mutters, \"I don\'t like that rock\"\n\n' +
    "he raises his fist and slams it down onto the rock with the fury of a thousand suns.\n\n" +
    '\"Take that, you smug little pebble!\" he says calm and monotone.\n\n' +
    "You watch in stunned silence as Marcus proceeds to beat the everloving heck out of this poor innocent rock." +
    "His fists are a blur. The rock doesn't stand a chance. Chunks of stone fly in every direction.\n\n" +
    '\"It\'s pissing me off.\" Marcus mutters in his trademark sociopathic wormitude.\n\n',
  victory_text:
    "Marcus crawls out of the fire, singed but alive. He's coughing up smoke and his eyebrows are gone. Or did he even have any to begin with?\n" +
    '\"Thanks... Robert\" he wheezes. \"You saved my life. That rock had it coming though.\"\n' +
    "You both agree to never speak of this again. The adventure continues.\n",
  defeat_text:
    "You couldn't save him. Marcus remains in the fire, a monument to poor decision-making and rock-related rage.\n" +
    'You continue your adventure alone, forever haunted by the memory of your friend\'s final words: \"It\'s pissing me off.\"\n',
};

// ---------------- Combat Logic ----------------

function calculateDamage(attackerPower, defenderDefense) {
  const base = Math.max(attackerPower - Math.floor(defenderDefense / 2), 1);
  const minimum = Math.max(Math.floor(base * 0.85), 1);
  const maximum = Math.max(Math.floor(base * 1.15), minimum);
  const dmg = randomInt(minimum, maximum);
  return Math.max(dmg, 3);
}

function enemyChooseAction(enemy, enemyHealth) {
  if (enemy.name === "Rock") return "defend";

  const pct = (enemyHealth / enemy.max_health) * 100;
  let atk, def;

  if (pct > 60) {
    atk = enemy.aggression;
    def = 100 - enemy.aggression;
  } else if (pct > 30) {
    atk = enemy.aggression * 0.7;
    def = 100 - atk;
  } else {
    if (enemy.aggression > 70) {
      atk = 90;
      def = 10;
    } else {
      atk = 30;
      def = 70;
    }
  }

  return weightedChoice(["attack", "defend"], [atk, def]);
}

function printHealthStatus(player, enemyName, enemyHealth) {
  printLine(`\n${player.name}'s health: ${player.health}`);
  printLine(`${enemyName}'s health: ${enemyHealth}`);
}

function applyVictoryRewards(player) {
  const r = DIFFICULTY_SETTINGS[player.difficulty].rewards;
  player.health = Math.min(player.health + Math.trunc(r.health), player.max_health);
  player.attack += Math.trunc(r.attack);
  player.level += 1;
}

async function handleEnemyDefeat(player, enemyName) {
  printLine(`The ${enemyName} has been defeated! You gain experience and rest!\n`);
  applyVictoryRewards(player);
  await getUserInput("[Continue]", ["continue"]);
}

async function playerAttackRound(player, enemy, enemyHealth, enemyAction) {
  const log = [];
  const playerDamage = calculateDamage(player.attack, enemy.defense);

  if (enemyAction === "attack") {
    enemyHealth -= playerDamage;
    log.push(`${player.name} attacked and dealt ${playerDamage} damage!`);

    if (enemyHealth <= 0) return { enemyHealth, defeated: true, log };

    const enemyDamage = calculateDamage(enemy.attack, player.defense);
    player.health -= enemyDamage;
    log.push(`The ${enemy.name} attacked back and dealt ${enemyDamage} damage!`);
    return { enemyHealth, defeated: false, log };
  }

  const reducedDamage = Math.floor(playerDamage / 2);
  const counterDamage = Math.floor(enemy.attack / 3);
  enemyHealth -= reducedDamage;
  player.health -= counterDamage;

  log.push(`${player.name} attacked for ${playerDamage} damage!`);
  log.push(
    `The ${enemy.name} raised its guard and blocked most of it! Only took ${reducedDamage} damage.`
  );
  log.push(`Its counterattack dealt ${counterDamage} damage to you!`);

  return { enemyHealth, defeated: enemyHealth <= 0, log };
}

async function playerDefendRound(player, enemy, enemyHealth, enemyAction) {
  const log = [];

  if (enemyAction === "attack") {
    const enemyDamage = calculateDamage(enemy.attack, player.defense);
    const reduced = Math.floor(enemyDamage / 2);
    const counter = Math.floor(player.attack / 3);

    player.health -= reduced;
    enemyHealth -= counter;

    log.push(`${player.name} raised their guard!`);
    log.push(
      `The ${enemy.name} attacked for ${enemyDamage} damage, but you blocked most of it!`
    );
    log.push(`You took ${reduced} damage and countered for ${counter} damage!`);

    return { enemyHealth, log };
  }

  player.health -= 2;
  enemyHealth -= 2;

  log.push(`${player.name} and the ${enemy.name} both brace for impact!`);
  log.push(`You circle each other warily. Both take 2 damage from exhaustion.`);

  return { enemyHealth, log };
}

// ---------------- Special Robert Encounter ----------------

async function robertWatchMarcusFight(player) {
  let helpAttempts = 0;
  const marcusPhrases = [
    '\"Help me... Robert...\"',
    '\"Robert... This hurts worse than getting shanked in the leg by Big Badinky Bones at Panera Bread.\"',
    '\"Robert... Why did you allow me to yeet myself into this fire?\"',
    '\"Robert... This fire is pissing me off.\"'
  ];

  // Phase 1: Watch Marcus beat up the rock
  clearScreen();
  printLine("\nMarcus is absolutely destroying this rock. Pebbles everywhere.\n");
  printLine("His knuckles are bleeding. The rock is 50% dust now. He's not stopping.\n");
  await getUserInput("[Continue]", ["continue"]);

  clearScreen();
  printLine("\nThe rock is now gravel. Marcus raises his arms in triumph.\n");
  printLine('\"Victory...\" he says calmly and monotone to the heavens.\n');
  printLine("\nThen... he looks at the campfire.\n");
  await getUserInput("[Continue]", ["continue"]);

  clearScreen();
  printLine('\n\"The rock... it made me do terrible things,\" Marcus says.\n');
  printLine('\"There\'s only one way to cleanse this guilt...\"\n');
  printLine("\nBefore you can stop him, in a blind fit of the calmest, slowest, most uneccessary rage, he dives face first directly into the campfire.\n");
  await getUserInput("[Continue]", ["continue"]);

  // Phase 2: The rescue attempts
  while (helpAttempts < 3) {
    clearScreen();

    if (helpAttempts === 0) {
      printLine("\nMarcus is rolling around in the fire, screaming for help.\n");
      printLine("The flames are everywhere. This is a disaster.\n");
    } else if (helpAttempts === 1) {
      printLine("\nMarcus is still in the fire. He's doing this weird flailing thing.\n");
      printLine("Is he... is he swimming in the fire? That's not helping, Marcus.\n");
    } else {
      printLine("\nMarcus has given up flailing. He's just lying there dramatically.\n");
      printLine("But he's still saying Robert. So at least he's alive.\n");
    }

    printLine(`\nMarcus: ${marcusPhrases[helpAttempts]}\n`);

    const choice = await validateInput("1. Help Marcus\n2. Tell him to get out\n> ", ["1", "2"]);

    clearScreen();

    if (choice === "1") {
      helpAttempts += 1;
      if (helpAttempts < 3) {
        printLine("\nYou reach toward the fire to help Marcus!\n");
        printLine("\nBut the heat is too intense! You pull back, singed.\n");
        printLine("Marcus continues writhing in the flames.\n");
        await getUserInput("[Continue]", ["continue"]);
      } else {
        // Success!
        printLine("\nWith a heroic burst of determination, you grab a nearby branch!\n");
        printLine("You extend it to Marcus. He grabs hold!\n");
        printLine("\nWith a mighty heave, you YANK Marcus out of the fire!\n");
        printLine("He tumbles onto the ground, smoking and coughing.\n");
        await getUserInput("[Continue]", ["continue"]);

        clearScreen();
        printLine('\nMarcus looks up at you with tears in his eyes.\n');
        printLine('\"That rock... it was so smug, Robert. So smug.\"\n');
        printLine("\nYou help him to his feet. His hair is mostly gone.\n");
        printLine('\"We don\'t talk about this,\" you say firmly.\n');
        printLine('\"Agreed,\" Marcus nods. \"What rock?\"\n');
        await getUserInput("[Continue]", ["continue"]);

        return "victory";
      }
    } else {
      // choice === "2"
      printLine('\n\"Marcus, just GET OUT!\" you yell.\n');
      printLine("\nMarcus looks at you from the flames.\n");
      printLine(`\nMarcus: ${marcusPhrases[Math.min(helpAttempts, marcusPhrases.length - 1)]}\n`);
      printLine("\nYeah, that's not working.\n");
      await getUserInput("[Continue]", ["continue"]);
    }
  }

  return "victory";
}

// ---------------- Fight and Scenario Functions ----------------

async function fightEnemy(enemy, player) {
  let enemyHealth = enemy.max_health;

  while (enemyHealth > 0 && player.health > 0) {
    clearScreen();
    printHealthStatus(player, enemy.name, enemyHealth);

    const choice = await validateInput("1. Attack   2. Defend\n> ", ["1", "2"]);

    clearScreen();
    printHealthStatus(player, enemy.name, enemyHealth);
    printLine("");

    const enemyAction = enemyChooseAction(enemy, enemyHealth);

    if (choice === "1") {
      const { enemyHealth: eh, defeated, log } = await playerAttackRound(
        player,
        enemy,
        enemyHealth,
        enemyAction
      );
      enemyHealth = eh;
      log.forEach((m) => printLine(m));

      if (defeated) {
        await handleEnemyDefeat(player, enemy.name);
        return "victory";
      }
    } else {
      const { enemyHealth: eh, log } = await playerDefendRound(
        player,
        enemy,
        enemyHealth,
        enemyAction
      );
      enemyHealth = eh;
      log.forEach((m) => printLine(m));
    }

    if (enemyHealth <= 0) {
      await handleEnemyDefeat(player, enemy.name);
      return "victory";
    }

    if (player.health <= 0) {
      await getUserInput("[Continue]", ["continue"]);
      return "game_over";
    }

    await getUserInput("[Continue]", ["continue"]);
  }

  return null;
}

async function scenario(player, encounter) {
  // Special handling for Robert's campfire encounter
  if (encounter.name === "Marcus's Sanity") {
    clearScreen();
    printLine(encounter.intro_text);
    await getUserInput("[Continue]", ["continue"]);
    const result = await robertWatchMarcusFight(player);
    clearScreen();
    if (result === "victory") {
      printLine(encounter.victory_text);
      await getUserInput("[Continue]", ["continue"]);
    }
    return result;
  }

  const enemy = Enemy.fromConfig(encounter, player.difficulty);
  clearScreen();
  printLine(encounter.intro_text);
  await getUserInput("[Continue]", ["continue"]);

  const result = await fightEnemy(enemy, player);

  clearScreen();
  if (result === "victory") {
    printLine(encounter.victory_text);
    await getUserInput("[Continue]", ["continue"]);
    return "victory";
  }

  if (result === "game_over") {
    printLine(encounter.defeat_text);
    if (encounter.defeat_followup_prompt) {
      await getUserInput(encounter.defeat_followup_prompt, ["continue"]);
      if (encounter.defeat_followup_text) {
        printLine(encounter.defeat_followup_text);
      }
    }
    await getUserInput("[Continue]", ["continue"]);
    return "game_over";
  }

  return result;
}

function describeCrossroad(player, encounters, defeated, introTemplate) {
  const pathCount = encounters.campfire ? "five" : "four";
  printLine(`\nHello ${player.name}.\n`);
  printLine(introTemplate.replace("{path_count}", pathCount));

  Object.keys(encounters).forEach((dir) => {
    printLine(encounters[dir].crossroad_description);
  });

  printLine("");

  if (defeated.length) {
    printLine(`Defeated enemies: ${defeated.join(", ")}\n`);
  }
}

function buildDirectionPrompt(encounters) {
  const options = Object.keys(encounters)
    .map((d) => d[0].toUpperCase() + d.slice(1))
    .join(" / ");
  return `Which direction will you choose? (${options})\n> `;
}

// ---------------- Main ----------------

async function main() {
  clearScreen();
  printLine(`
********************************
********************************
** Welcome to Epic Adventure! **
********************************
********************************
`);
  await getUserInput("Press Enter to continue...", ["continue"]);

  // Difficulty
  clearScreen();
  printLine("\n" + "=".repeat(50));
  printLine("SELECT YOUR DIFFICULTY:");
  printLine("=".repeat(50));

  const difficulty = await validateInput(
    "\nChoose your difficulty (Easy / Medium / Hard)\n> ",
    ["easy", "medium", "hard"]
  );

  printLine(`  Difficulty set to: ${difficulty.toUpperCase()}`);

  const name = await getUserInput("\nWhat is your name?\n> ", [], true);
  const player = new Player(name.trim(), difficulty);

  clearScreen();

  const isMarcus = player.name.toLowerCase() === "marcus";
  const isRobert = player.name.toLowerCase() === "robert";

  const encounters = { ...BASE_ENCOUNTERS };
  if (isMarcus) encounters.campfire = MARCUS_ROCK_ENCOUNTER;
  if (isRobert) encounters.campfire = ROBERT_CAMPFIRE_ENCOUNTER;

  const defeated = [];
  let firstVisit = true;

  while (true) {
    if (defeated.length === Object.keys(encounters).length) {
      clearScreen();
      printLine(
        `\nCongratulations ${player.name}!!! You have defeated all the enemies and completed the epic adventure on ${difficulty.toUpperCase()} mode!\n`
      );
      await getUserInput(
        "Press ENTER to end game and get back to your life, loser.",
        ["continue"]
      );
      break;
    }

    clearScreen();
    const introTemplate = firstVisit
      ? "You find yourself suddenly teleported to an unfamiliar crossroad surrounded by {path_count} different paths.\n"
      : "You find yourself at the crossroad surrounded by {path_count} different paths.\n";

    describeCrossroad(player, encounters, defeated, introTemplate);
    firstVisit = false;

    const dir = await validateInput(
      buildDirectionPrompt(encounters),
      Object.keys(encounters)
    );

    if (defeated.includes(dir)) {
      printLine("You have already cleared this path. Try another direction.");
      await getUserInput("[Continue]", ["continue"]);
      continue;
    }

    const result = await scenario(player, encounters[dir]);
    if (result === "victory") {
      defeated.push(dir);
    } else if (result === "game_over") {
      clearScreen();
      printLine("\nUnfortunately, your adventure has come to an end.\n");
      await getUserInput("Press ENTER to die.", ["continue"]);
      printLine("\nx_x You died.\n");
      await getUserInput("Exit", ["exit"]);
      break;
    }
  }
}

// Kick off
window.addEventListener("load", () => {
  main();
});
