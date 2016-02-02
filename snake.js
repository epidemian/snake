var COLS = 20;
var MAP_WIDTH = COLS * 2;
var MAP_HEIGHT = 4;
var TILE_EMPTY = 0;
var TILE_SNAKE = 1;
var TILE_FOOD = 2;
var UP = [0, -1];
var DOWN = [0, 1];
var LEFT = [-1, 0];
var RIGHT = [1, 0];

var map;
var snake;
var direction;

function init() {
  map = new Array(MAP_WIDTH * MAP_HEIGHT).fill(TILE_EMPTY);
  snake = [[3, 2], [2, 2], [1, 2], [0, 2]];
  snake.forEach(function (snakePoint) {
    setTileAt(snakePoint[0], snakePoint[1], TILE_SNAKE)
  });
  direction = RIGHT;
  dropFood();
}

function tick() {
  updateWorld();
  drawWorld();
}

function updateWorld() {
  var head = snake[0];
  var newX = head[0] + direction[0];
  var newY = head[1] + direction[1];

  var gameOver = newX < 0 || newX >= MAP_WIDTH
    || newY < 0 || newY >= MAP_HEIGHT
    || tileAt(newX, newY) === TILE_SNAKE;
  if (gameOver) {
    init();
    return;
  }

  var ateFood = tileAt(newX, newY) === TILE_FOOD;
  setTileAt(newX, newY, TILE_SNAKE);
  snake.unshift([newX, newY]);

  if (ateFood) {
    dropFood();
  } else {
    var tail = snake.pop();
    setTileAt(tail[0], tail[1], TILE_EMPTY);
  }
}

function drawWorld() {
  var mapStr = '';
  for (var col = 0; col < COLS; col++) {
    // Unicode Braille patterns are 256 code points going from 0x2800 to 0x28FF.
    // They follow a binary pattern where the bits are, from least significant
    // to most: ⠁⠂⠄⠈⠐⠠⡀⢀
    // So, for example, 147 (10010011) corresponds to ⢓
    var x = col * 2;
    var n = 0
      | bitAt(x, 0) << 0
      | bitAt(x, 1) << 1
      | bitAt(x, 2) << 2
      | bitAt(x + 1, 0) << 3
      | bitAt(x + 1, 1) << 4
      | bitAt(x + 1, 2) << 5
      | bitAt(x, 3) << 6
      | bitAt(x + 1, 3) << 7;
    mapStr += String.fromCharCode(0x2800 + n);
  }
  window.history.replaceState(null, mapStr, '?|' + mapStr + '|');
}

function tileAt(x, y) {
  return map[x % MAP_WIDTH + y * MAP_WIDTH];
}

function bitAt(x, y) {
  return tileAt(x, y) === TILE_EMPTY ? 0 : 1;
}

function setTileAt(x, y, tileType) {
  map[x % MAP_WIDTH + y * MAP_WIDTH] = tileType;
}

function dropFood() {
  var emptyTiles = map.length - snake.length;
  if (emptyTiles === 0) {
    return;
  }
  var dropCounter = Math.floor(Math.random() * emptyTiles);
  for (var i = 0; i < map.length; i++) {
    if (map[i] === TILE_SNAKE)
      continue;
    if (dropCounter === 0) {
      map[i] = TILE_FOOD;
      break;
    }
    dropCounter--;
  }
}

function changeDirection(d) {
  if (d[0] + direction[0] !== 0 || d[1] + direction[1] !== 0) {
    // Not opposite direction.
    direction = d;
  }
}

var DIRECTIONS_BY_KEY_CODE = {37: LEFT, 38: UP, 39: RIGHT, 40: DOWN};
document.addEventListener('keydown', function (event) {
  var key = event.keyCode;
  if (key in DIRECTIONS_BY_KEY_CODE) {
    changeDirection(DIRECTIONS_BY_KEY_CODE[key]);
  }
});

init();
window.setInterval(tick, 100);
