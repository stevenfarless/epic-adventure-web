// ============================================================
// GAME CONFIGURATION & CONSTANTS
// ============================================================

const CONFIG = {
	MAX_HEALTH: 100,
	PLAYER_BASE_ATTACK: 15,
	PLAYER_BASE_DEFENSE: 5,
	DAMAGE_VARIANCE: { min: 0.85, max: 1.15 },
	MIN_DAMAGE: 3,

	// Difficulty-based player stats
	DIFFICULTY: {
		easy: {
			healthBonus: 30,
			attackBonus: 5,
			defenseBonus: 3,
			healthRecovery: 25,
			attackGain: 3
		},
		medium: {
			healthBonus: 0,
			attackBonus: 0,
			defenseBonus: 0,
			healthRecovery: 15,
			attackGain: 2
		},
		hard: {
			healthBonus: -20,
			attackBonus: -3,
			defenseBonus: -2,
			healthRecovery: 10,
			attackGain: 1
		}
	},

	// Enemy difficulty multipliers
	ENEMY_DIFFICULTY: {
		easy: {
			healthMultiplier: 0.7,
			attackMultiplier: 0.75,
			defenseMultiplier: 0.7
		},
		medium: {
			healthMultiplier: 1.0,
			attackMultiplier: 1.0,
			defenseMultiplier: 1.0
		},
		hard: {
			healthMultiplier: 1.4,
			attackMultiplier: 1.3,
			defenseMultiplier: 1.3
		}
	}
};

const HEALTH_THRESHOLDS = {
	HIGH: 60,
	MEDIUM: 30
};

// ============================================================
// CLASSES
// ============================================================

class Character {
	constructor(name, health, attack, defense) {
		this.name = name;
		this.health = health;
		this.maxHealth = health;
		this.attack = attack;
		this.defense = defense;
	}

	get isAlive() {
		return this.health > 0;
	}

	get healthPercent() {
		return (this.health / this.maxHealth) * 100;
	}

	takeDamage(amount) {
		this.health = Math.max(0, this.health - amount);
		return this.health;
	}

	heal(amount) {
		this.health = Math.min(this.maxHealth, this.health + amount);
	}
}

class Player extends Character {
	constructor(name, difficulty) {
		const difficultyConfig = CONFIG.DIFFICULTY[difficulty];
		const health = CONFIG.MAX_HEALTH + difficultyConfig.healthBonus;
		const attack = CONFIG.PLAYER_BASE_ATTACK + difficultyConfig.attackBonus;
		const defense = CONFIG.PLAYER_BASE_DEFENSE + difficultyConfig.defenseBonus;

		super(name, health, attack, defense);
		this.difficulty = difficulty;
		this.level = 1;
	}

	levelUp() {
		this.level++;
		const difficultyConfig = CONFIG.DIFFICULTY[this.difficulty];
		this.attack += difficultyConfig.attackGain;
		this.heal(difficultyConfig.healthRecovery);
	}
}

class Enemy extends Character {
	constructor(name, health, attack, defense, aggression, difficulty) {
		const difficultyMultiplier = CONFIG.ENEMY_DIFFICULTY[difficulty];

		const adjustedHealth = Math.floor(
			health * difficultyMultiplier.healthMultiplier
		);
		const adjustedAttack = Math.floor(
			attack * difficultyMultiplier.attackMultiplier
		);
		const adjustedDefense = Math.floor(
			defense * difficultyMultiplier.defenseMultiplier
		);

		super(name, adjustedHealth, adjustedAttack, adjustedDefense);
		this.aggression = aggression;
	}

	chooseAction() {
		const healthPercent = this.healthPercent;
		let attackChance;

		if (healthPercent > HEALTH_THRESHOLDS.HIGH) {
			attackChance = this.aggression;
		} else if (healthPercent > HEALTH_THRESHOLDS.MEDIUM) {
			attackChance = this.aggression * 0.7;
		} else {
			attackChance = this.aggression > 70 ? 90 : 30;
		}

		return Math.random() * 100 < attackChance ? "attack" : "defend";
	}
}

// ============================================================
// GAME STATE MANAGER
// ============================================================

class GameState {
	constructor() {
		this.player = null;
		this.defeatedEnemies = new Set();
		this.currentEnemy = null;
		this.difficulty = null;
	}

	reset() {
		this.player = null;
		this.defeatedEnemies.clear();
		this.currentEnemy = null;
		this.difficulty = null;
	}

	setDifficulty(difficulty) {
		this.difficulty = difficulty;
	}

	setPlayer(name) {
		this.player = new Player(name, this.difficulty);
	}

	defeatEnemy(direction) {
		this.defeatedEnemies.add(direction);
	}

	hasDefeated(direction) {
		return this.defeatedEnemies.has(direction);
	}

	get allEnemiesDefeated() {
		return this.defeatedEnemies.size === 4;
	}

	get defeatedEnemyNames() {
		return Array.from(this.defeatedEnemies).map(
			(dir) => dir.charAt(0).toUpperCase() + dir.slice(1)
		);
	}
}

// ============================================================
// UI MANAGER
// ============================================================

class UIManager {
	constructor() {
		this.gameText = document.getElementById("game-text");
		this.textInput = document.getElementById("text-input");
		this.buttonContainer = document.getElementById("button-container");
	}

	print(text) {
		this.gameText.insertAdjacentHTML("beforeend", `${text}\n`);
		this.gameText.scrollTop = this.gameText.scrollHeight;
	}

	clear() {
		this.gameText.innerHTML = "";
	}

	showButtons(buttons) {
		const fragment = document.createDocumentFragment();

		buttons.forEach(({ text, callback, className = "" }) => {
			const button = document.createElement("button");
			button.textContent = text;
			button.onclick = callback;
			if (className) button.className = className;
			fragment.appendChild(button);
		});

		this.buttonContainer.innerHTML = "";
		this.buttonContainer.appendChild(fragment);
	}

	showTextInput(callback) {
		this.textInput.classList.remove("hidden");
		this.textInput.value = "";
		this.textInput.focus();

		const handleSubmit = () => {
			const value = this.textInput.value.trim();
			if (value) {
				this.textInput.classList.add("hidden");
				this.textInput.onkeypress = null;
				callback(value);
			}
		};

		this.showButtons([
			{
				text: "Submit",
				callback: handleSubmit
			}
		]);

		this.textInput.onkeypress = (e) => {
			if (e.key === "Enter") handleSubmit();
		};
	}

	hideInputs() {
		this.textInput.classList.add("hidden");
		this.buttonContainer.innerHTML = "";
	}

	showHealthStatus(player, enemy, enemyHealth) {
		this.print(`\n${player.name}'s health: ${player.health}`);
		this.print(`${enemy.name}'s health: ${enemyHealth}`);
	}
}

// ============================================================
// COMBAT SYSTEM
// ============================================================

class CombatSystem {
	static calculateDamage(attackerPower, defenderDefense) {
		const baseDamage = attackerPower - Math.floor(defenderDefense / 2);
		const { min, max } = CONFIG.DAMAGE_VARIANCE;
		const variance = Math.floor(baseDamage * (min + Math.random() * (max - min)));
		return Math.max(variance, CONFIG.MIN_DAMAGE);
	}

	static processCombatRound(
		playerAction,
		enemyAction,
		player,
		enemy,
		enemyHealth
	) {
		const results = {
			playerDamage: 0,
			enemyDamage: 0,
			message: [],
			enemyDefeated: false,
			playerDefeated: false
		};

		if (playerAction === "attack" && enemyAction === "attack") {
			results.playerDamage = this.calculateDamage(player.attack, enemy.defense);
			results.enemyDamage = this.calculateDamage(enemy.attack, player.defense);

			enemyHealth -= results.playerDamage;
			results.message.push(
				`${player.name} attacked and dealt ${results.playerDamage} damage!`
			);

			if (enemyHealth <= 0) {
				results.enemyDefeated = true;
				results.message.push(
					`The ${enemy.name} has been defeated! You gain experience and rest!`
				);
			} else {
				player.takeDamage(results.enemyDamage);
				results.message.push(
					`The ${enemy.name} attacked back and dealt ${results.enemyDamage} damage!`
				);
			}
		} else if (playerAction === "attack" && enemyAction === "defend") {
			const fullDamage = this.calculateDamage(player.attack, enemy.defense);
			results.playerDamage = Math.floor(fullDamage / 2);
			results.enemyDamage = Math.floor(enemy.attack / 3);

			enemyHealth -= results.playerDamage;
			player.takeDamage(results.enemyDamage);

			results.message.push(
				`${player.name} attacked for ${fullDamage} damage!`,
				`The ${enemy.name} raised its guard and blocked most of it! Only took ${results.playerDamage} damage.`,
				`Its counterattack dealt ${results.enemyDamage} damage to you!`
			);

			if (enemyHealth <= 0) {
				results.enemyDefeated = true;
				results.message.push(
					`The ${enemy.name} has been defeated! You gain experience and rest!`
				);
			}
		} else if (playerAction === "defend" && enemyAction === "attack") {
			const fullDamage = this.calculateDamage(enemy.attack, player.defense);
			results.enemyDamage = Math.floor(fullDamage / 2);
			results.playerDamage = Math.floor(player.attack / 3);

			player.takeDamage(results.enemyDamage);
			enemyHealth -= results.playerDamage;

			results.message.push(
				`${player.name} raised their guard!`,
				`The ${enemy.name} attacked for ${fullDamage} damage, but you blocked most of it!`,
				`You took ${results.enemyDamage} damage and countered for ${results.playerDamage} damage!`
			);
		} else {
			const exhaustionDamage = 2;
			player.takeDamage(exhaustionDamage);
			enemyHealth -= exhaustionDamage;

			results.message.push(
				`${player.name} and the ${enemy.name} both brace for impact!`,
				`You circle each other warily. Both take ${exhaustionDamage} damage from exhaustion.`
			);
		}

		results.playerDefeated = !player.isAlive;
		results.enemyHealth = enemyHealth;

		return results;
	}
}

// ============================================================
// ENEMY & SCENARIO DATA
// ============================================================

function createEnemies(difficulty) {
	return {
		north: new Enemy("Bear", 50, 15, 3, 75, difficulty),
		east: new Enemy("Bandit Leader", 70, 18, 5, 60, difficulty),
		south: new Enemy("Cave Troll", 90, 22, 8, 85, difficulty),
		west: new Enemy("Dragon", 150, 28, 10, 50, difficulty)
	};
}

const SCENARIOS = {
	north: `
	You enter the dense forest.
The air is thick with the scent of pine and damp earth.
As you walk deeper, you hear rustling in the bushes.
You try to ignore it and decide to keep walking. 
Before you can take another step, out lunges a wild bear!
It's hungry as heck and you look delicious!
`,
	east: `
	As you head towards the distant village,
following the trail of smoke, you notice something alarming:
the village is under attack by a group of bandits!
	Their leader gestures to his gang, and they quickly encircle you both.
Their chants of 'FIGHT! FIGHT! FIGHT!' echo through the air.`,
	south: `
	You enter the mysterious cave.
The air is cool and damp, with faint echoes bouncing off the walls.
As you venture deeper, you notice glowing crystals illuminating the path.
You start to feel uneasy, so you turn around to leave.
You turn and find yourself face to face with a troll!
	'Your bones will make a great addition to my collection!'`,
	west: `
	You start your ascent up the steep mountain path.
The higher you climb, the more breathtaking the view becomes.
After a challenging climb, you reach a serene mountaintop lake.
	The air grows suddenly cold.
The wind picks up, carrying a bone-chilling roar that echoes through the peaks.
Your heart pounds as a colossal shadow blots out the sun.
With a thunderous crash, a dragon descends from the swirling clouds,
its scales gleaming ominously. Its piercing eyes lock onto you,
and its wings cast a dark shadow over the lake.
The ground trembles beneath its massive claws as it emits a low, rumbling growl.

You ready your weapon`
};

const VICTORY_MESSAGES = {
	Bear:
		"Feeling triumphant after defeating the bear, you continue your journey.",
	Dragon:
		"Filled with adrenaline from defeating the dragon, you continue your journey.",
	"Cave Troll":
		"The defeated troll slumps to the ground, allowing you to proceed deeper into the cave.",
	"Bandit Leader":
		"With the bandit leader defeated, the villagers thank you and you continue your journey."
};

const DEFEAT_MESSAGES = {
	Bear: {
		initial:
			"The bear's attack overwhelms you.\nYou hear the bear say a prayer, thanking his bear deity for this delicious feast.",
		prompt: "[Press button to say 'Amen' with the bear]",
		final: "You can't talk. The bear ripped your throat out.\n\tBummer."
	},
	Dragon: {
		initial:
			"The dragon's fire leaves you badly burned. You retreat from the mountain to die in peace."
	},
	"Cave Troll": {
		initial:
			"The troll's brute strength overwhelms you.\nYou attempt to retreat from the cave to die in peace, but you are trapped.\n\nYour bones join the pile of hundreds of other stupid...\nI mean...\nbrave...\nadventurers."
	},
	"Bandit Leader": {
		initial:
			"The bandit leader lands his final blow. The bandits fight over who gets to keep your sweet loot.\nYou try to get up and retreat, but the bandits stole your feet."
	}
};

// ============================================================
// GAME CONTROLLER
// ============================================================

class GameController {
	constructor() {
		this.state = new GameState();
		this.ui = new UIManager();
		this.enemies = null;
	}

	start() {
		this.ui.print(`
*******************************************
*******************************************
******* Welcome to the Epic Adventure! ***
*******************************************
*******************************************
        `);

		this.ui.showButtons([
			{
				text: "Press Enter to continue...",
				callback: () => this.promptDifficulty()
			}
		]);
	}

	promptDifficulty() {
		this.ui.clear();
		this.ui.print("\n" + "=".repeat(50));
		this.ui.print("SELECT YOUR DIFFICULTY:");
		this.ui.print("=".repeat(50));
		this.ui.print("\nChoose your difficulty:");

		this.ui.showButtons([
			{
				text: "Easy",
				callback: () => this.setDifficulty("easy")
			},
			{
				text: "Medium",
				callback: () => this.setDifficulty("medium")
			},
			{
				text: "Hard",
				callback: () => this.setDifficulty("hard")
			}
		]);
	}

	setDifficulty(difficulty) {
		this.state.setDifficulty(difficulty);
		this.enemies = createEnemies(difficulty);
		this.ui.clear();
		this.ui.print(`Difficulty set to: ${difficulty.toUpperCase()}`);
		this.promptPlayerName();
	}

	promptPlayerName() {
		this.ui.print("\nWhat is your name?");
		this.ui.showTextInput((name) => {
			this.state.setPlayer(name);
			this.showIntroduction();
		});
	}

	showIntroduction() {
		this.ui.clear();
		const { player } = this.state;
		this.ui.print(
			`\nHello ${player.name}.\n\nYou find yourself suddenly teleported to an unfamiliar crossroad surrounded by four different paths.\n`
		);
		this.ui.print(
			"To the North:\tYou see a dense forest stretching as far as the eye can see."
		);
		this.ui.print("To the East:\tYou see smoke rising from a distant village.");
		this.ui.print(
			"To the South:\tYou see a mysterious cave entrance beckoning with an eerie glow."
		);
		this.ui.print(
			"To the West:\tYou see a narrow path leading up a steep mountain.\n"
		);

		this.ui.showButtons([
			{
				text: "Continue",
				callback: () => this.showDirectionChoice()
			}
		]);
	}

	showDirectionChoice() {
		if (this.state.allEnemiesDefeated) {
			this.handleVictory();
			return;
		}

		this.ui.clear();
		const { player } = this.state;
		this.ui.print(
			`\nHello ${player.name}.\n\nYou find yourself at the crossroad surrounded by four different paths.\n`
		);
		this.ui.print(
			"To the North:\tYou see a dense forest stretching as far as the eye can see."
		);
		this.ui.print("To the East:\tYou see smoke rising from a distant village.");
		this.ui.print(
			"To the South:\tYou see a mysterious cave entrance beckoning with an eerie glow."
		);
		this.ui.print(
			"To the West:\tYou see a narrow path leading up a steep mountain.\n"
		);

		if (this.state.defeatedEnemies.size > 0) {
			this.ui.print(
				`Defeated enemies: ${this.state.defeatedEnemyNames.join(", ")}\n`
			);
		}

		this.ui.print(
			"Which direction will you choose? (North / East / South / West)\n"
		);

		const buttons = Object.keys(this.enemies).map((direction) => ({
			text: direction.charAt(0).toUpperCase() + direction.slice(1),
			callback: () => this.handleDirectionChoice(direction)
		}));

		this.ui.showButtons(buttons);
	}

	handleDirectionChoice(direction) {
		if (this.state.hasDefeated(direction)) {
			this.ui.clear();
			this.ui.print(
				"You've already defeated that enemy. Choose another direction.\n"
			);
			this.ui.showButtons([
				{
					text: "Continue",
					callback: () => this.showDirectionChoice()
				}
			]);
			return;
		}

		const enemy = this.enemies[direction];
		const scenario = SCENARIOS[direction];
		this.startScenario(enemy, scenario, direction);
	}

	startScenario(enemy, scenarioText, direction) {
		this.ui.clear();
		this.ui.print(scenarioText);
		this.ui.showButtons([
			{
				text: "Continue",
				callback: () => this.startCombat(enemy, direction)
			}
		]);
	}

	startCombat(enemy, direction) {
		let enemyHealth = enemy.maxHealth;

		const combatRound = () => {
			this.ui.clear();
			this.ui.showHealthStatus(this.state.player, enemy, enemyHealth);

			this.ui.showButtons([
				{ text: "1. Attack", callback: () => processTurn("attack") },
				{ text: "2. Defend", callback: () => processTurn("defend") }
			]);
		};

		const processTurn = (playerAction) => {
			this.ui.clear();
			this.ui.showHealthStatus(this.state.player, enemy, enemyHealth);

			const enemyAction = enemy.chooseAction();
			const results = CombatSystem.processCombatRound(
				playerAction,
				enemyAction,
				this.state.player,
				enemy,
				enemyHealth
			);

			this.ui.print("\n" + results.message.join("\n"));
			enemyHealth = results.enemyHealth;

			if (results.enemyDefeated) {
				this.handleCombatVictory(enemy, direction);
			} else if (results.playerDefeated) {
				this.handleCombatDefeat(enemy);
			} else {
				this.ui.showButtons([
					{
						text: "Continue",
						callback: combatRound
					}
				]);
			}
		};

		combatRound();
	}

	handleCombatVictory(enemy, direction) {
		this.state.player.levelUp();
		this.ui.clear();
		this.ui.print(`${VICTORY_MESSAGES[enemy.name]}\n`);

		this.ui.showButtons([
			{
				text: "Continue",
				callback: () => {
					this.state.defeatEnemy(direction);
					this.showDirectionChoice();
				}
			}
		]);
	}

	handleCombatDefeat(enemy) {
		this.ui.clear();
		const defeatMsg = DEFEAT_MESSAGES[enemy.name];
		this.ui.print(`\n${defeatMsg.initial}\n`);

		if (enemy.name === "Bear") {
			this.ui.print(defeatMsg.prompt);
			this.ui.showButtons([
				{
					text: "Amen",
					callback: () => {
						this.ui.clear();
						this.ui.print(defeatMsg.final);
						this.showGameOver();
					}
				}
			]);
		} else {
			this.showGameOver();
		}
	}

	showGameOver() {
		this.ui.print("\nUnfortunately, your adventure has come to an end.\n");
		this.ui.showButtons([
			{
				text: "Press ENTER to die",
				callback: () => {
					this.ui.clear();
					this.ui.print("\nx_x You died.\n");
					this.ui.showButtons([
						{
							text: "Exit",
							callback: () => {
								this.ui.print("\nGame Over. Refresh to play again!");
								this.ui.hideInputs();
							}
						}
					]);
				}
			}
		]);
	}

	handleVictory() {
		this.ui.clear();
		const { player } = this.state;
		this.ui.print(
			`\nCongratulations ${
				player.name
			}!!! You have defeated all the enemies and completed the epic adventure on ${this.state.difficulty.toUpperCase()} mode!\n`
		);
		this.ui.showButtons([
			{
				text: "Press ENTER to end game and get back to your life, loser.",
				callback: () => {
					this.ui.print("\nThanks for playing!");
					this.ui.hideInputs();
				}
			}
		]);
	}
}

// ============================================================
// INITIALIZE GAME
// ============================================================

const game = new GameController();

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => game.start());
} else {
	game.start();
}
