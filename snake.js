"use strict";

var GRID_WIDTH = 40;
var SNAKE_CELL = 1;
var FOOD_CELL = 2;
var UP = {x: 0, y: -1};
var DOWN = {x: 0, y: 1};
var LEFT = {x: -1, y: 0};
var RIGHT = {x: 1, y: 0};
var INITIAL_SNAKE_LENGTH = 4;

var grid;
var snake;
var currentDirection;
var moveQueue;
var gamePaused = false;

function main() {
  setupEventHandlers();
  drawMaxScore();
  startGame();

  var lastFrameTime = new Date;
  window.requestAnimationFrame(function frameHandler() {
    var now = new Date;
    if (!gamePaused && now - lastFrameTime >= tickTime()) {
      updateWorld();
      drawWorld();
      lastFrameTime = now;
    }
    window.requestAnimationFrame(frameHandler);
  });
}

function setupEventHandlers() {
  var directionsByKey = {
    37: LEFT, 38: UP, 39: RIGHT, 40: DOWN,
    65: LEFT, 87: UP, 68: RIGHT, 83: DOWN
  };

  document.onkeydown = function (event) {
    var key = event.keyCode;
    if (key in directionsByKey) {
      changeDirection(directionsByKey[key]);
    }
  };

  $('#up').onmousedown = function () { changeDirection(UP); };
  $('#down').onmousedown = function () { changeDirection(DOWN); };
  $('#left').onmousedown = function () { changeDirection(LEFT); };
  $('#right').onmousedown = function () { changeDirection(RIGHT); };

  window.onblur = function pauseGame() {
    gamePaused = true;
    window.history.replaceState(null, null, location.search + '[paused]')
  };

  window.onfocus = function unpauseGame() {
    gamePaused = false;
    drawWorld();
  };
}

function startGame() {
  grid = new Array(GRID_WIDTH * 4);
  snake = [];
  for (var x = 0; x < INITIAL_SNAKE_LENGTH; x++) {
    var y = 2;
    snake.unshift({x: x, y: y});
    setCellAt(x, y, SNAKE_CELL)
  }
  currentDirection = RIGHT;
  moveQueue = [];
  dropFood();
}

function updateWorld() {
  if (moveQueue.length) {
    currentDirection = moveQueue.pop();
  }

  var head = snake[0];
  var tail = snake[snake.length - 1];
  var newX = head.x + currentDirection.x;
  var newY = head.y + currentDirection.y;

  var outOfBounds = newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= 4;
  var collidesWithSelf = cellAt(newX, newY) === SNAKE_CELL
    && !(newX === tail.x && newY === tail.y);

  if (outOfBounds || collidesWithSelf) {
    endGame();
    startGame();
    return;
  }

  var eatsFood = cellAt(newX, newY) === FOOD_CELL;
  if (!eatsFood) {
    snake.pop();
    setCellAt(tail.x, tail.y, null);
  }

  // Advance head after tail so it can occupy the same cell on next tick.
  setCellAt(newX, newY, SNAKE_CELL);
  snake.unshift({x: newX, y: newY});

  if (eatsFood) {
    dropFood();
  }
}

function endGame() {
  var score = currentScore();
  var maxScore = parseInt(localStorage.maxScore || 0);
  if (score > 0 && score > maxScore) {
    localStorage.maxScore = score;
    localStorage.maxScoreGrid = gridString();
    drawMaxScore()
  }
}

function drawWorld() {
  var query = '?|' + gridString() + '|[score:' + currentScore() + ']';
  history.replaceState(null, null, query);
}

function gridString() {
  var str = '';
  for (var x = 0; x < GRID_WIDTH; x += 2) {
    // Unicode Braille patterns are 256 code points going from 0x2800 to 0x28FF.
    // They follow a binary pattern where the bits are, from least significant
    // to most: ⠁⠂⠄⠈⠐⠠⡀⢀
    // So, for example, 147 (10010011) corresponds to ⢓
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
  return str;
}

function tickTime() {
  // Game speed increases as snake grows.
  var start = 125;
  var end = 75;
  return start + snake.length * (end - start) / grid.length;
}

function currentScore() {
  return snake.length - INITIAL_SNAKE_LENGTH;
}

function cellAt(x, y) {
  return grid[x % GRID_WIDTH + y * GRID_WIDTH];
}

function bitAt(x, y) {
  return cellAt(x, y) ? 1 : 0;
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
    if (grid[i] === SNAKE_CELL)
      continue;
    if (dropCounter === 0) {
      grid[i] = FOOD_CELL;
      break;
    }
    dropCounter--;
  }
}

function changeDirection(newDir) {
  var lastDir = moveQueue[0] || currentDirection;
  var opposite = newDir.x + lastDir.x === 0 && newDir.y + lastDir.y === 0;
  if (!opposite) {
    // Process moves in a queue to prevent multiple direction changes per tick.
    moveQueue.unshift(newDir);
  }
}

function drawMaxScore() {
  var maxScore = localStorage.maxScore;
  if (maxScore == null) return;
  var maxScoreGrid = localStorage.maxScoreGrid;
  $('#max-score').innerText = maxScore;
  $('#max-score-grid').innerText = maxScoreGrid;
  $('#max-score-container').classList.remove('invisible');
  $('#twitter-share-button').href = twitterShareUrl(maxScore, maxScoreGrid);
  $('#facebook-share-button').href = facebookShareUrl()
}

function twitterShareUrl(maxScore, maxScoreGrid) {
  var tweet = maxScoreGrid + '| Got ' + maxScore +
    ' points playing this stupid snake game on the address bar!';
  return 'https://twitter.com/intent/tweet' +
    '?url=' + encodeURIComponent(canonicalUrl()) +
    '&text=' + encodeURIComponent(tweet)
}

function facebookShareUrl() {
  return 'https://www.facebook.com/sharer/sharer.php?u=' +
    encodeURIComponent(canonicalUrl());
}

function canonicalUrl() {
  return $('link[rel=canonical]').href;
}

var $ = document.querySelector.bind(document);

main();
