/* The program a fresh code editor starts with: tiny, and explained line by line for someone who has programmed before. */
const STARTER = `// ===== MY FIRST QRG GAME =====
// A QRG game is plain JavaScript. The code below is the body of a function:
//   1. first you declare your variables (they live as long as the game runs),
//   2. then you "return" a function that the engine calls 60 times per second.
// Tap the ? button for the full list of functions. The preview above restarts every time you type.

// --- 1. State: the things the game remembers ---------------------------------
let x = 120, y = 110;      // position of our square (the screen is 256 x 240 pixels)
let score = 0;             // how many times the player pressed A (or tapped)

// --- 2. The frame function: runs once per frame (60 per second) -------------
return i => {              // "i" is the input: buttons, keys, swipes and the finger
  cls(NAVY);               // clear the screen with a color (names: NAVY, RED, WHITE ... or numbers 0-15)

  // Input. Lower-case = held down, UPPER-case = pressed just now (once per press).
  if (i.l) x -= 2;         // D-pad / arrow key / swipe left
  if (i.r) x += 2;         // right
  if (i.u) y -= 2;         // up
  if (i.d) y += 2;         // down
  if (i.t) {               // a finger is touching the screen: follow it
    x = i.x - 8;           // i.x and i.y are the finger position in screen pixels
    y = i.y - 8;
  }
  if (i.A) {               // A button, Z key, Space or a tap on the screen
    score++;
    s(600);                // play a short beep (600 Hz). Use the speaker button to pick effects
  }

  // Drawing. r(x, y, width, height, color) fills a rectangle.
  r(x, y, 16, 16, ORANGE);

  // t(text, x, y, color) draws text with the built-in pixel font.
  t('SCORE ' + score, 4, 4, WHITE);
};
`;
