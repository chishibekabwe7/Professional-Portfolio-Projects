// HTML elements
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Initialize fields for text displays
ctx.textBaseline = 'middle';
ctx.textAlign = 'center';

// Keycodes for event listener
const ENTER_KEYCODE = 13;
const SPACE_KEYCODE = 32;
const LEFT_KEYCODE = 37;
const DOWN_KEYCODE = 38;
const RIGHT_KEYCODE = 39;
const UP_KEYCODE = 40;

// Constants for display
const speed = 7;
const tileCount = 22;
const tileSize = 18;

// Sound files
const sfx = {
    eat: new Audio('sounds/boop.mp3'),
    gameOver: new Audio('sounds/bonk.mp3')
}

// Snake position and velocities
let x_head = 10;
let y_head = 10;
let x_velocity = 0;
let y_velocity = 0;

// Snake body
class snakePart {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}
const snakeParts = [];
const bodyColors = [];

// Food position
let x_food = 5;
let y_food = 5;

// Score and booleans for miscellaneous functions
let score = 0;
let over = false;
let paused = false;

function drawGame() {
	if (paused) {
		ctx.fillStyle = 'white';
		ctx.font = '25px helvetica';
		ctx.fillText('Game is paused.', canvas.clientWidth/2, canvas.clientHeight/2);
	} else {
		updateSnakePosition();

		if (gameIsOver()) {
			sfx.gameOver.play();
			gameOverScreen();
			over = true;
			return;
		}

		clearScreen();
		drawSnake();

		/*
		* If snake has eaten food, move it to a new location,
		* play sfx, increase length of snake, and increment score
		*/
		if (x_food === x_head && y_food === y_head) {
			sfx.eat.play();
			moveFood();
			snakeParts.push(new snakePart(x_head, y_head));
			bodyColors.push('hsl(' + 360 * Math.random() + ', 50%, 50%)');
			score++;
		}

		drawFood();
		drawScore();
	}

	// Update screen 7 times per second
	setTimeout(drawGame, 1000/speed);
}

function clearScreen() {
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
}

function drawSnake() {
	// Draw head
	ctx.fillStyle = 'orange';
	ctx.fillRect(x_head * tileCount, y_head * tileCount, tileSize, tileSize);

	// Draw body
	for (let i = 0; i < snakeParts.length; i++) {
		part = snakeParts[i];
		ctx.fillStyle = bodyColors[i];
		ctx.fillRect(part.x * tileCount, part.y * tileCount, tileSize, tileSize);
	}
}

function updateSnakePosition() {
	let x_lastpos = x_head
	let y_lastpos = y_head

	x_head += x_velocity
	y_head += y_velocity

	// Move snake body parts to follow head
	for (const part of snakeParts) {
		let x_currentpos = part.x;
		let y_currentpos = part.y;

		part.x = x_lastpos;
		part.y = y_lastpos;

		x_lastpos = x_currentpos;
		y_lastpos = y_currentpos;
	}
}

function initializeFood() {
	moveFood();

	while (x_food === x_head && y_food === y_head)
		moveFood();
}

function drawFood() {
	ctx.fillStyle = "white";
	ctx.fillRect(x_food * tileCount, y_food * tileCount, tileSize, tileSize);
}

function moveFood() {
	x_food = Math.floor(Math.random() * tileCount);
	y_food = Math.floor(Math.random() * tileCount);
}

function drawScore() {
	ctx.fillStyle="white";
	ctx.font="16px helvetica";
	ctx.fillText("Score: " + score, canvas.clientWidth - 60, 25);
}

function keyDown(event) {
	if (over) {
		if (event.keyCode === SPACE_KEYCODE ||
			event.keyCode === ENTER_KEYCODE)
			location.reload();
	}
	else {
		switch (event.keyCode) {
			case LEFT_KEYCODE:
				if (x_velocity === 1)
					return;

				x_velocity = -1;
				y_velocity = 0;
				break;

			case DOWN_KEYCODE:
				if (y_velocity === 1)
					return;

				x_velocity = 0;
				y_velocity = -1;
				break;

			case RIGHT_KEYCODE:
				if (x_velocity === -1)
					return;

				x_velocity = 1;
				y_velocity = 0;
				break;

			case UP_KEYCODE:
				if (y_velocity === -1)
					return;

				x_velocity = 0;
				y_velocity = 1;
				break;

			case ENTER_KEYCODE:
			case SPACE_KEYCODE:
				togglePause();
				break;
		}
	}
}

function gameIsOver() {
	// If game hasn't started yet, return false
	if (x_velocity === 0 && y_velocity === 0)
		return false;

	let ret = false;

	// If snake bumps into a wall, return true
	if (x_head < 0 || x_head === tileCount ||
		y_head < 0 || y_head === tileCount)
		ret = true;

	// If snake bumps into itself, return true
	for (const part of snakeParts) {
		if (part.x === x_head && part.y === y_head) {
			ret = true;
			break;
		}
	}

	return ret;
}

function gameOverScreen() {
	ctx.fillStyle = 'white';
	ctx.font = '50px helvetica';
	ctx.fillText('Game over!', canvas.clientWidth / 2, canvas.clientHeight / 2);
	ctx.font = '20px helvetica';
	ctx.fillText('Press space or enter to play again.', canvas.clientWidth / 2, canvas.clientHeight * 3 / 5);
}

function togglePause() {
	paused = !paused;
}

(function mainline() {
	document.body.addEventListener('keydown', keyDown);
	over = false;
	// Randomize food location at start of each game for increased fun
	initializeFood();
	drawGame();
})();