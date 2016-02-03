"use strict";

var GRID_WIDTH = 40;
var GRID_HEIGHT = 4;
var CELL_EMPTY = 0;
var CELL_SNAKE = 1;
var CELL_FOOD = 2;
var UP = {x: 0, y: -1};
var DOWN = {x: 0, y: 1};
var LEFT = {x: -1, y: 0};
var RIGHT = {x: 1, y: 0};

var grid;
var snake;
var direction;
var moveQueue;
var lastFrameTime;
var paused = true;

function init() {
  grid = new Array(GRID_WIDTH * GRID_HEIGHT).fill(CELL_EMPTY);
  snake = [{x: 3, y: 2}, {x: 2, y: 2}, {x: 1, y: 2}, {x: 0, y: 2}];
  snake.forEach(function (segment) {
    setCellAt(segment.x, segment.y, CELL_SNAKE)
  });
  direction = RIGHT;
  moveQueue = [];
  dropFood();
}

function onAnimationFrame() {
  var now = new Date;
  var tickElapsed = (now - lastFrameTime >= tickTime() || !lastFrameTime);
  if (!paused && tickElapsed) {
    tick();
    lastFrameTime = now;
  }
  window.requestAnimationFrame(onAnimationFrame);
}

function tickTime() {
  // Game speed increases as snake grows.
  return 125 - 50 * snake.length / grid.length;
}

function tick() {
  updateWorld();
  drawWorld();
}

function updateWorld() {
  if (moveQueue.length) {
    direction = moveQueue.pop();
  }

  var head = snake[0];
  var newX = head.x + direction.x;
  var newY = head.y + direction.y;
  var gameOver = newX < 0 || newX >= GRID_WIDTH
    || newY < 0 || newY >= GRID_HEIGHT
    || cellAt(newX, newY) === CELL_SNAKE;
  if (gameOver) {
    init();
    return;
  }

  var ateFood = cellAt(newX, newY) === CELL_FOOD;
  setCellAt(newX, newY, CELL_SNAKE);
  snake.unshift({x: newX, y: newY});

  if (ateFood) {
    dropFood();
  } else {
    var tail = snake.pop();
    setCellAt(tail.x, tail.y, CELL_EMPTY);
  }
}

function drawWorld() {
  var str = '';
  var length = GRID_WIDTH / 2;
  for (var i = 0; i < length; i++) {
    // Unicode Braille patterns are 256 code points going from 0x2800 to 0x28FF.
    // They follow a binary pattern where the bits are, from least significant
    // to most: ⠁⠂⠄⠈⠐⠠⡀⢀
    // So, for example, 147 (10010011) corresponds to ⢓
    var x = i * 2;
    var n = 0
      | bitAt(x, 0) << 0
      | bitAt(x, 1) << 1
      | bitAt(x, 2) << 2
      | bitAt(x + 1, 0) << 3
      | bitAt(x + 1, 1) << 4
      | bitAt(x + 1, 2) << 5
      | bitAt(x, 3) << 6
      | bitAt(x + 1, 3) << 7;
    str += String.fromCharCode(0x2800 + n);
  }
  window.history.replaceState(null, null, '#|' + str + '|');
}

function cellAt(x, y) {
  return grid[x % GRID_WIDTH + y * GRID_WIDTH];
}

function bitAt(x, y) {
  return cellAt(x, y) === CELL_EMPTY ? 0 : 1;
}

function setCellAt(x, y, cellType) {
  grid[x % GRID_WIDTH + y * GRID_WIDTH] = cellType;
}

function dropFood() {
  var emptyCells = grid.length - snake.length;
  if (emptyCells === 0) {
    return;
  }
  var dropCounter = Math.floor(Math.random() * emptyCells);
  for (var i = 0; i < grid.length; i++) {
    if (grid[i] === CELL_SNAKE)
      continue;
    if (dropCounter === 0) {
      grid[i] = CELL_FOOD;
      break;
    }
    dropCounter--;
  }
}

function changeDirection(newDir) {
  var lastDir = moveQueue[0] || direction;
  var opposite = newDir.x + lastDir.x === 0 && newDir.y + lastDir.y === 0;
  if (!opposite) {
    // Process moves in a queue to prevent multiple direction changes per tick.
    moveQueue.unshift(newDir);
  }
}

function setPaused(value) {
  paused = value;
  var pauseNotice = document.getElementById('pause-notice');
  pauseNotice.classList.toggle('invisible', !paused);
}

var DIRECTIONS_BY_KEY_CODE = {
  37: LEFT, 38: UP, 39: RIGHT, 40: DOWN,
  65: LEFT, 87: UP, 68: RIGHT, 83: DOWN
};
document.addEventListener('keydown', function (event) {
  var key = event.keyCode;
  if (key in DIRECTIONS_BY_KEY_CODE) {
    changeDirection(DIRECTIONS_BY_KEY_CODE[key]);
  }
});

window.addEventListener('focus', function() { setPaused(false); });
window.addEventListener('blur', function() { setPaused(true); });

init();
window.requestAnimationFrame(onAnimationFrame);
