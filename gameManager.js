'use strict';


const Deck = require('./deck');

module.exports = class GameManager {
  constructor(players){
    this.players = players;
    this.deck = new Deck();
    this.life = this.deck.life();
    this._dealCards();
    this.winnerIndex = 0;
    this.playersPlayed = 0;
    this.roundPoints = 0;
    this.round = 0;
  }

  // Used for the first roud. 3 cards for each player.
  _dealCards() {
    for (var i = 0; i < this.players.length; i++) {
      for (var j = 0; j < CARDS_PER_PLAYER; j++) {
        let newCard = this.deck.dealCard();
        this.players[i].cards.push(newCard);
      }
    }
  }

  // Deal 1 card to each player. Starting from the winner of previous round
  dealCards() {
    for (var i = this.winnerIndex; i < (this.winnerIndex + this.players.length); i++) {
      this.players[i % this.players.length].cards.push(this.deck.dealCard());
    }
  }
  clearRound() {
    this.players[this.winnerIndex].points += this.roundPoints;
    this.roundPoints = 0;
    this.playersPlayed = 0;
  }

  // Sum up all the points for each card played
  _calRoundPoints() {
    for (var i = 0; i < this.players.length; i++) {
      this.roundPoints += this.players[i].cardPlayed.points;
    }
  }

  // Will reduce the logic later on. First I wanted to state explicitly how
  // the rules work in a human readable way.
  // Calculates the winner of the round.
  _calRoundWinner() {
    let winnerCard = this.players[this.winnerIndex].cardPlayed;

    // Start from the second player on...
    for (var i = this.winnerIndex + 1; i < (this.winnerIndex + this.players.length); i++) {

      // Game logic
      let contender = this.players[i % this.players.length].cardPlayed;

      // Contender has a card with suit of life and current winner doesn't
      if(winnerCard.suit !== this.life.suit && contender.suit === this.life.suit){
        console.log('Case1');
        winnerCard = contender;
        continue;
      }
      // Both are life suits and Contender has higher hierarchy value
      if ( winnerCard.suit === this.life.suit && contender.suit === this.life.suit && contender.hierarchy > winnerCard.hierarchy) {
        console.log('Case2');
        winnerCard = contender;
        continue;
      }
      // Neither one has life suit, but are the same suit... and Contender has higher hierarchy value
      if (winnerCard.suit !== this.life.suit && contender.suit !== this.life.suit && winnerCard.suit === contender.suit && contender.hierarchy > winnerCard.hierarchy) {
        console.log('Case3');
        winnerCard = contender;
        continue;
      }

    }
    // Update winnerIndex (Useless if the winner remained the same)
    console.log('Winning Card:', winnerCard);
    this.winnerIndex = this.players.findIndex( (player) => {
      return player.cardPlayed === winnerCard;
    });

  }

  // Calculate Round Info and update players cards
  calRound() {
    // Calculate total Round Points
    this._calRoundPoints();
    // Calculate Round Winner
    this._calRoundWinner();
    // Clear all cardPlayed from all players (Set to null)
    for (var i = 0; i < this.players.length; i++) {
      this.players[i].cardPlayed = null;
    }
    // Test if there's still cards on the deck.
    if(!this.deck.isEmpty()) {
      // Load new cards to each player.
      this.dealCards();
    }
    // Increment round counter
    this.round++;
  }

  calGameWinner() {
    // Assign the winnerIndex value to the index of the winner of the game.
    for (var i = 0; i < this.players.length; i++) {
      if (this.players[i].points > this.players[this.winnerIndex].points) {
        this.winnerIndex = i;
      }
    }
    // Update each players' gamesWon/gamesLost value.
    for (var i = 0; i < this.players.length; i++) {
      if (i === this.winnerIndex) {
        this.players[i].gamesWon++;
      }
      else {
        this.players[i].gamesLost++;
      }
    }

  }
  hasEnded() {
    return this.round === DECK_SIZE / this.players.length;
  }
}


const CARDS_PER_PLAYER = 3;
const DECK_SIZE = 40;
