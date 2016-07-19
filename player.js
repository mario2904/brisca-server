'use strict';

const Card = require('./card');

module.exports = class Player {

  constructor (id) {
    this.id = id;
    this.inGame = "";
    this.points = 0;
    this.gamesWon = 0;
    this.gamesLost = 0;
    this.cards = [];
    this.cardPlayed = null;
  }
  // Really dangerous not checking edge cases. Assuming card is always a valid
  // card in player's hand.
  // Removes card from hand and places it in cardPlayed.
  playCard(strCard) {
    const i = this.cards.findIndex((card) => card.card === strCard);
    this.cardPlayed = (this.cards.splice(i, 1 )).pop();
  }



}
