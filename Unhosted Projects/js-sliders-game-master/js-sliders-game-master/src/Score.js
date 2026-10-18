export class Score {
  constructor(size, scoreFactor, $) {
    this.updateScore = scoreFactor * size;
    this.scoreFactor = scoreFactor;
    this.$ = $;
    this.init();
  }
  set updateScore(n) {
    this.moves = n;
  }
  get currentMoves() {
    return this.moves;
  }
  init() {
    this.startingScore = this.currentMoves;
    this.$('.score-display').textContent = this.startingScore;
    this.$('#add-score-form').style.display = 'none';
    this.$('.player-name-wrapper').innerHTML = '';
  }
  update(blocks) {
    this.updateScore = this.currentMoves - 1;
    this.$('.score-display').textContent = this.currentMoves;
    const winStatus = blocks.every(
      (item, index) => item.currentNum == item.div.id
    );
    if (winStatus == true) {
      const total = this.startingScore - this.currentMoves;
      this.$('#add-score-form').style.display = 'initial';
      this.$('.win-display').innerHTML = `
        <span>Well done! you won in <strong>${total}</strong> moves, with a score of 
          <span class="moves">${this.currentMoves}</span>. 
          Please add your name to the Leader Board:
        </span>`;
      this.$('.player-name-wrapper').innerHTML = `
        <input id="player-name" type="text" class="m-b-10" required placeholder="Your name (min 3, max 20)" maxlength="20">
        <label for="player-name" class="error-message"></label>`;
      this.$('#player-name').focus();
    }
  }
}
