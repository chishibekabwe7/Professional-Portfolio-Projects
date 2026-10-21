import { Block } from './src/Block.js';
import { Game } from './src/Game.js';
import { Score } from './src/Score.js';

const $ = (elem) => document.querySelector(elem);
const $$ = (elem) => document.querySelectorAll(elem);

const blockSize = getComputedStyle($('body')).getPropertyValue('--block-size');
const borderSize = getComputedStyle($('body')).getPropertyValue(
  '--border-size'
);

window.startGame = async () => {
  if (!$('.shuffle-display').classList.contains('hide')) return;
  const size = $('#game-size').value || 3;
  // Fetch a signed token from the server encoding the grid size. Sent with the
  // score on win so the server can verify the score is within bounds.
  let gameToken;
  try {
    ({ gameToken } = await fetch('/api/game/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ size: parseInt(size, 10) })
    }).then((r) => r.json()));
  } catch (err) {
    console.error('Failed to start game:', err.message);
    return;
  }
  window.currentGameToken = gameToken;
  const scoreFactor = 150;
  const score = new Score(size, scoreFactor, $);
  window.game = new Game(size, score, $, $$);
  window.num = 13;
  game.createGrid(blockSize, borderSize);
  game.createDivs();
  const blocks = [];
  game.divs.forEach((div, index) => {
    const block = new Block({ index, size, div, currentNum: index + 1 });
    block.addSwapEvent(div, blocks, score, game);
    blocks.push(block);
  });
  game.shuffle(blocks);
};

window.toggleHelp = (state) => {
  $('.help').classList[state]('show');
};

document.addEventListener('DOMContentLoaded', () => {
  startGame();
});

document.querySelector('#year').textContent = new Date().getFullYear();
