'use strict';

var GRID_WIDTH = 40;
var SNAKE_CELL = 1;
var FOOD_CELL = 2;
var UP = {x: 0, y: -1};
var DOWN = {x: 0, y: 1};
var LEFT = {x: -1, y: 0};
var RIGHT = {x: 1, y: 0};
var INITIAL_SNAKE_LENGTH = 4;
var BRAILLE_SPACE = '\u2800';

var grid;
var snake;
var currentDirection;
var moveQueue;
var hasMoved;
var gamePaused = false;
var urlRevealed = false;
var whitespaceReplacementChar;

function main() {
  detectBrowserUrlWhitespaceEscaping();
  cleanUrl();
  setupEventHandlers();
  drawMaxScore();
  initUrlRevealed();
  startGame();

  var lastFrameTime = Date.now();
  window.requestAnimationFrame(function frameHandler() {
    var now = Date.now();
    if (!gamePaused && now - lastFrameTime >= tickTime()) {
      updateWorld();
      drawWorld();
      lastFrameTime = now;
    }
    window.requestAnimationFrame(frameHandler);
  });
}

function detectBrowserUrlWhitespaceEscaping() {
  // Write two Braille whitespace characters to the hash because Firefox doesn't
  // escape single WS chars between words.
  history.replaceState(null, null, '#' + BRAILLE_SPACE + BRAILLE_SPACE)
  if (location.hash.indexOf(BRAILLE_SPACE) == -1) {
    console.warn('Browser is escaping whitespace characters on URL')
    var replacementData = pickWhitespaceReplacementChar();
    whitespaceReplacementChar = replacementData[0];
    $('#url-escaping-note').classList.remove('invisible');
    $('#replacement-char-description').textContent = replacementData[1];
  }
}

function cleanUrl() {
  // In order to have the most space for the game, shown on the URL hash,
  // remove all query string parameters and trailing / from the URL.
  history.replaceState(null, null, location.pathname.replace(/\b\/$/, ''));
}

function setupEventHandlers() {
  var directionsByKey = {
    // Arrows
    37: LEFT, 38: UP, 39: RIGHT, 40: DOWN,
    // WASD
    87: UP, 65: LEFT, 83: DOWN, 68: RIGHT
  };

  document.onkeydown = function (event) {
    var key = event.keyCode;
    if (key in directionsByKey) {
      changeDirection(directionsByKey[key]);
    }
  };

  // Use touchstart instead of mousedown because these arrows are only shown on
  // touch devices, and also because there is a delay between touchstart and
  // mousedown on those devices, and the game should respond ASAP.
  $('#up').ontouchstart = function () { changeDirection(UP) };
  $('#down').ontouchstart = function () { changeDirection(DOWN) };
  $('#left').ontouchstart = function () { changeDirection(LEFT) };
  $('#right').ontouchstart = function () { changeDirection(RIGHT) };

  window.onblur = function pauseGame() {
    gamePaused = true;
    window.history.replaceState(null, null, location.hash + '[paused]');
  };

  window.onfocus = function unpauseGame() {
    gamePaused = false;
    drawWorld();
  };

  $('#reveal-url').onclick = function (e) {
    e.preventDefault();
    setUrlRevealed(!urlRevealed);
  };

  document.querySelectorAll('.expandable').forEach(function (expandable) {
    var expand = expandable.querySelector('.expand-btn');
    var collapse = expandable.querySelector('.collapse-btn');
    var content = expandable.querySelector('.expandable-content');
    expand.onclick = collapse.onclick = function () {
      expand.classList.remove('hidden');
      content.classList.remove('hidden');
      expandable.classList.toggle('expanded');
    };
    // Hide the expand button or the content when the animation ends so those
    // elements are not interactive anymore.
    // Surely there's a way to do this with CSS animations more directly.
    expandable.ontransitionend = function () {
      var expanded = expandable.classList.contains('expanded');
      expand.classList.toggle('hidden', expanded);
      content.classList.toggle('hidden', !expanded);
    };
  });
}

function initUrlRevealed() {
  setUrlRevealed(Boolean(localStorage.urlRevealed));
}

// Some browsers don't display the page URL, either partially (e.g. Safari) or
// entirely (e.g. mobile in-app web-views). To make the game playable in such
// cases, the player can choose to "reveal" the URL within the page body.
function setUrlRevealed(value) {
  urlRevealed = value;
  $('#url-container').classList.toggle('invisible', !urlRevealed);
  if (urlRevealed) {
    localStorage.urlRevealed = 'y';
  } else {
    delete localStorage.urlRevealed;
  }
}

function startGame() {
  grid = new Array(GRID_WIDTH * 4);
  snake = [];
  for (var x = 0; x < INITIAL_SNAKE_LENGTH; x++) {
    var y = 2;
    snake.unshift({x: x, y: y});
    setCellAt(x, y, SNAKE_CELL);
  }
  currentDirection = RIGHT;
  moveQueue = [];
  hasMoved = false;
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
  if (score > 0 && score > maxScore && hasMoved) {
    localStorage.maxScore = score;
    localStorage.maxScoreGrid = gridString();
    drawMaxScore();
    showMaxScore();
  }
}

function drawWorld() {
  var hash = '#|' + gridString() + '|[score:' + currentScore() + ']';

  if (urlRevealed) {
    // Use the original game representation on the on-DOM view, as there are no
    // escaping issues there.
    $('#url').textContent = location.href.replace(/#.*$/, '') + hash;
  }

  // Modern browsers escape whitespace characters on the address bar URL for
  // security reasons. In case this browser does that, replace the empty Braille
  // character with a non-whitespace (and hopefully non-intrusive) symbol.
  if (whitespaceReplacementChar) {
    hash = hash.replace(/\u2800/g, whitespaceReplacementChar);
  }

  history.replaceState(null, null, hash);

  // Some browsers have a rate limit on history.replaceState() calls, resulting
  // in the URL not updating at all for a couple of seconds. In those cases,
  // location.hash is updated directly, which is unfortunate, as it causes a new
  // navigation entry to be created each time, effectively hijacking the user's
  // back button.
  if (decodeURIComponent(location.hash) !== hash) {
    console.warn(
      'history.replaceState() throttling detected. Using location.hash fallback'
    );
    location.hash = hash;
  }
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
    if (grid[i] === SNAKE_CELL) {
      continue;
    }
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
  hasMoved = true;
}

function drawMaxScore() {
  var maxScore = localStorage.maxScore;
  if (maxScore == null) {
    return;
  }

  var maxScoreGrid = localStorage.maxScoreGrid;
  $('#max-score').innerText = maxScore;
  $('#max-score-grid').innerText = maxScoreGrid;
  $('#max-score-container').classList.remove('invisible');

  if (navigator.share) {
    $('#share').classList.remove('invisible');
    $('#share').onclick = function (e) {
      e.preventDefault();
      shareScore(maxScore, maxScoreGrid);
    };
  }
}

// Expands the high score details if collapsed. Only done when beating the
// highest score, to grab the player's attention.
function showMaxScore() {
  if ($('#max-score-container.expanded')) return
  $('#max-score-container .expand-btn').click();
}

function shareScore(score, grid) {
  navigator.share({
    url: $('link[rel=canonical]').href,
    text: '|' + grid + '| Got ' + score +
      ' points playing this stupid snake game on the browser URL!'
  });
}

// Super hacky function to pick a suitable character to replace the empty
// Braille character (u+2800) when the browser escapes whitespace on the URL.
// We want to pick a character that's close in width to the empty Braille symbol
// —so the game doesn't stutter horizontally—, and also pick something that's
// not too visually noisy. So we actually measure how wide and how "dark" some
// candidate characters are when rendered by the browser (using a canvas) and
// pick the first that passes both criteria.
function pickWhitespaceReplacementChar() {
  var candidates = [
    // U+0ADF is part of the Gujarati Unicode blocks, but it doesn't have an
    // associated glyph. For some reason, Chrome renders is as totally blank and
    // almost the same size as the Braille empty character, but it doesn't
    // escape it on the address bar URL, so this is the perfect replacement
    // character. This behavior of Chrome is probably a bug, and might be
    // changed at any time, and in other browsers like Firefox this character is
    // rendered with an ugly "undefined" glyph, so it'll get filtered out by the
    // width or the "blankness" check in either of those cases.
    ['૟', 'strange symbols'],
    // U+27CB Mathematical Rising Diagonal, not a great replacement for
    // whitespace, but is close to the correct size and blank enough.
    ['⟋', 'some weird slashes']
  ];

  var N = 5;
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  ctx.font = '30px system-ui';
  var targetWidth = ctx.measureText(BRAILLE_SPACE.repeat(N)).width;

  for (var i = 0; i < candidates.length; i++) {
    var char = candidates[i][0];
    var str = char.repeat(N);
    var width = ctx.measureText(str).width;
    var similarWidth = Math.abs(targetWidth - width) / targetWidth <= 0.1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillText(str, 0, 30);
    var pixelData = ctx.getImageData(0, 0, width, 30).data;
    var totalPixels = pixelData.length / 4;
    var coloredPixels = 0;
    for (var j = 0; j < totalPixels; j++) {
      var alpha = pixelData[j * 4 + 3];
      if (alpha != 0) {
          coloredPixels++;
      }
    }
    var notTooDark = coloredPixels / totalPixels < 0.15;

    if (similarWidth && notTooDark) {
      return candidates[i];
    }
  }

  // Fallback to a safe U+2591 Light Shade.
  return ['░', 'some kind of "fog"'];
}

var $ = document.querySelector.bind(document);

main();
