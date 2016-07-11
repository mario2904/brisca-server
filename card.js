'use strict';


module.exports = class Card {

  constructor(card) {
    this.card = card;
    this.suit = this.card.slice(-1);
    this.rank = parseInt(this.card.slice(0,-1));
    this.hierarchy = hierarchyValues[this.rank];
    this.points = this._calPoints(this.rank);
  }
  _calPoints(rank) {
    if (rank === 1) {
      return 11;
    }
    else if (rank === 3) {
      return 10;
    }
    else if (rank === 10) {
      return 2;
    }
    else if (rank === 11) {
      return 3;
    }
    else if (rank === 12) {
      return 4;
    }
    else {
      return 0;
    }
  }
}

const hierarchyValues = [0,10,1,9,2,3,4,5,0,0,6,7,8];
