'use strict';


const Card = require('./card')

module.exports = class Deck {
  constructor(){
    this._deck = [];

    // Get all 40 cards
    for (var i = 0; i < DECK_SIZE; i++) {
      this._deck.push(new Card(cardNames[i]));
    }
    // Shuffle
    this._shuffle();

  }
  _shuffle() {
    for (var i = 0; i < DECK_SIZE; i++) {

      // choose a random int
      const d = Math.floor(Math.random() * DECK_SIZE);

      // swap cards
      const tmp = this._deck[d];
      this._deck[d] = this._deck[i];
      this._deck[i] = tmp;
    }
  }
  dealCard() {
    return this._deck.pop();
  }
  life() {
    //Return the life card, it's the last card dealt from the deck
    return this._deck[0];
  }

}

const DECK_SIZE = 40

const cardNames = ["1o", "2o", "3o", "4o","5o", "6o", "7o", "10o", "11o","12o",
              "1b", "2b", "3b", "4b","5b", "6b", "7b", "10b", "11b","12b",
              "1e", "2e", "3e", "4e","5e", "6e", "7e", "10e", "11e","12e",
              "1c", "2c", "3c", "4c","5c", "6c", "7c", "10c", "11c","12c"];
