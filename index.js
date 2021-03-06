'use strict';

//const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');

const PORT = process.env.PORT || 8000;


const wss = new SocketServer({ port: PORT });
console.log(`Listening on port: ${ PORT }`)


// Random name Generator
const Moniker = require('moniker');

const Player = require('./player');
const GameManager = require('./gameManager')


// Tables in db
const players = {}; // Schema: id: '<playerId>' => player: '<player>'
const games = {};   // Schema: id: '<gameId>' => {players: [playerId:String, ...], numOfPlayers: <size: int>, gameManager: <GameManager>}

// Save client connections
const clients = {};

// Game Id Counter (Later change for a random uuid generator)
var gameId = "0";


wss.on('connection', (ws) => {
  console.log('Client connected');

  // Generate a random id
  const id = Moniker.choose();
  // and create a new Player with this id as username
  const newPlayer = new Player(id);
  // Save player in the db
  players[id] = newPlayer;
  // Save ws socket connection mapped to player id
  clients[id] = ws;
  // Send player his general Information
  const myInfoPlayer = {
    cmd: 'myInfoPlayer',
    payload: {
      id: id,
      inGame: newPlayer.inGame,
      points: newPlayer.points,
      gamesWon: newPlayer.gamesWon,
      gamesLost: newPlayer.gamesLost
    }
  };
  ws.send(JSON.stringify(myInfoPlayer));
  // Broadcast to all players to update their list of players. Pass in the newly
  // created player. IMPORTANT: Client must handle getting passed his info 2 times
  console.log("KEYS:", Object.keys(clients));
  const cmdNewPlayer = {cmd: 'newPlayer', payload: {player: id}};
  wss.clients.forEach((client) => {
    client.send(JSON.stringify(cmdNewPlayer));
  });
  // Send player all currently available players. Their player names
  const initPlayers = {cmd: 'initPlayers', payload: {players: Object.keys(players)}};
  ws.send(JSON.stringify(initPlayers));
  // Send player all currently available games. The game ID's
  const initAvailableGames = {cmd: 'initAvailableGames', payload: {games: Object.keys(games)}};
  ws.send(JSON.stringify(initAvailableGames));
  // Handle request logic here
  ws.on('message', (message) => {
    console.log('Received:', message);

    // Parse command message
    const msg = JSON.parse(message);
    console.log(msg);

    // Delete player. Format => {cmd: 'deletePlayer', player:'<player>'}
    // TODO: Figure out if this method is necessary. If so, need to Remove
    // the corresponding client from the dictionary of ws connections
    // and disconnect him from this ws
    if(msg.cmd === 'deletePlayer') {
      // Get player from db
      const player = players[msg.player];
      // Handle Error if player is not in the db
      if (player === undefined) {
        const error = {cmd: 'Error', info: 'player not found', player: msg.player};
        ws.send(JSON.stringify(error));
      }
      else {
        // Delete player from db
        delete players[msg.player]
        ws.send('Player deleted:' + msg.player);
      }

    }
    // Show Player information. Format => {cmd: 'getPlayerInfo', player:'<player>'}
    else if (msg.cmd === 'getPlayerInfo') {
      // Get player from db
      const player = players[msg.player];
      // Handle Error if player is not in the db
      if (player === undefined) {
        const error = {cmd: 'Error', info: 'player not found', player: msg.player};
        ws.send(JSON.stringify(error));
      }
      else {
        // Builld the response
        const playerInfo = {
          cmd: 'playerInfo',
          payload: {
            id: player.id,
            inGame: player.inGame,
            points: player.points,
            gamesWon: player.gamesWon,
            gamesLost: player.gamesLost
          }
        };
        ws.send(JSON.stringify(playerInfo));
      }
    }
    // Show Game information. Format => {cmd: 'getGameInfo', gameId:'<gameId>'}
    else if (msg.cmd === 'getGameInfo') {
      // Get game from db
      const game = games[msg.gameId];
      // Handle Error if game is not in the db
      if (game === undefined) {
        const error = {cmd: 'Error', info: 'game not found', gameId: msg.gameId};
        ws.send(JSON.stringify(error));
      }
      else {
        // Builld the response
        const gameInfo = {
          cmd: 'gameInfo',
          payload: {
            id: msg.gameId,
            numOfPlayers: game.numOfPlayers,
            players: game.players
          }
        };
        ws.send(JSON.stringify(gameInfo));
      }
    }
    // Create a newGame. Format => {cmd: 'createGame', numOfPlayers: <int>}
    else if (msg.cmd === 'createGame') {
      // Search myself in the db and make (myself) aware that i'm now registered to a game
      // with game id -> 'gameId'. (The one I myself just creaed)
      players[id].inGame = gameId;
      // Create a new 'Game' with the given gameId.
      games[gameId] = {};
      // And register myself as a player in that game.
      // By adding my playerId in the list
      games[gameId].players = [id];
      // Register the num of players required for the game
      games[gameId].numOfPlayers = parseInt(msg.numOfPlayers);
      // Build JSON of the newly created game.
      const payload = {
        id: gameId,
        numOfPlayers: games[gameId].numOfPlayers,
        players: games[gameId].players
      }
      // Send it to myself.
      ws.send(JSON.stringify({cmd: 'myInfoGame', payload}));
      // Broadcast the newly created available game. Send only the gameId.
      wss.clients.forEach((client) => {
        client.send(JSON.stringify({cmd: 'newAvailableGame', payload: {gameId: payload.id}}));
      });
      // Generate new gameId
      gameId = (parseInt(gameId) + 1).toString();
    }
    // Join an existing game. Format => {cmd: 'joinGame', gameId: '<gameId>'}
    else if (msg.cmd === 'joinGame') {
      // Handle Error if game is not in the db
      if (games[msg.gameId] === undefined) {
        const error = {cmd: 'Error', info: 'game not found', gameId: msg.gameId};
        ws.send(JSON.stringify(error));
      }
      // TODO: Handle error if game is already full.
      else {
        const game = games[msg.gameId];
        // Search myself in the db and make (myself) aware that i'm now registered to a game
        // with game id -> 'msg.gameId'.
        players[id].inGame = msg.gameId;
        // Register myself as a player in that game.
        // By adding my playerId in the list
        game.players.push(id);
        // Send a message to all players registered in this game
        // the message contains the updated list of players registered in the game
        const myInfoGame = {
          cmd: 'myInfoGame',
          payload: {
            id: msg.gameId,
            numOfPlayers: game.numOfPlayers,
            players: game.players          }
        };
        // Send the updated game info to all players registered in this game
        game.players.forEach(player => {
          clients[player].send(JSON.stringify(myInfoGame));
        });
        // TODO: check if it has reached the game.numOfPlayers === game.players.length
        if (game.numOfPlayers === game.players.length) {
          // Get all players information and store them in new array
          const gamePlayers = game.players.map(playerId => players[playerId])
          // Initialize game
          game.gameManager = new GameManager(gamePlayers);
          // Send the start game command to all players registered in this game
          // Tell them their initial cards (hand), life card and players id
          game.players.forEach((playerId, i) => {
            const startGame = {
              cmd: 'startGame',
              payload: {
                life: game.gameManager.life.card,
                myCards: players[playerId].cards.map(card => card.card),
                myIndex: i,
                numOfPlayers: game.players.length,
                players: game.players
              }
            };
            clients[playerId].send(JSON.stringify(startGame));
          });
        }
      }
    }
    // Leave commands: askToPlay and acceptRequestToPlay on hold for the moment...
    // Request another player to play. Format => {cmd:'askToPlay', playerTo: '<playerTo>'}
    else if (msg.cmd === 'askToPlay') {
      // Get player from db
      const player = players[msg.playerTo];
      // Handle Error if playerTo is not in the db
      if (player === undefined) {
        const error = {cmd: 'Error', info: 'player not found', player: msg.playerTo};
        ws.send(JSON.stringify(error));
      }
      // Handle Error if the player that is requesting isn't registered to a game
      else if (players[id].inGame === "") {
        const error = {cmd: 'Error', info: 'player not registered in a game', player: id};
        ws.send(JSON.stringify(error));
      }
      else {
        // Get gameId of game
        const gameId = players[id].inGame;
        // Build the request
        const requestToPlay = {
          cmd: 'requestToPlay',
          playerFrom: id,
          numOfPlayers: games[gameId].numOfPlayers,
          gameId: gameId
        };
        // Request playerTo to play a game
        clients[msg.playerTo].send(JSON.stringify(requestToPlay));

      }

    }
    // Accept a given request to play. Format => {cmd: 'acceptRequestToPlay', gameId: '<gameId>'}
    else if (msg.cmd === 'acceptRequestToPlay') {
      // Handle Error if game is not in the db
      if (games[msg.gameId] === undefined) {
        const error = {cmd: 'Error', info: 'game not found', gameId: msg.gameId};
        ws.send(JSON.stringify(error));
      }
      else {
        const game = games[msg.gameId];
        // Search myself in the db and make (myself) aware that i'm now registered to a game
        // with game id -> 'msg.gameId'.
        players[id].inGame = msg.gameId;
        // Register myself as a player in that game.
        // By adding my playerId in the list
        game.players.push(id);
        // Send a message to all players registered in this game
        // the message contains the updated list of players registered in the game
        const updateGameInfo = {
          cmd: 'updateGameInfo',
          gameId: msg.gameId,
          numOfPlayers: game.numOfPlayers,
          players: game.players
        };
        // Send the updated game info to all players registered in this game
        game.players.forEach(player => {
          clients[player].send(JSON.stringify(updateGameInfo));
        });
        // TODO: check if it has reached the game.numOfPlayers === game.players.length
        if (game.numOfPlayers === game.players.length) {
          // Get all players information and store them in new array
          const gamePlayers = game.players.map(playerId => players[playerId])
          // Initialize game
          game.gameManager = new GameManager(gamePlayers);
          // Send the start game command to all players registered in this game
          // Tell them their initial cards (hand) and life card
          game.players.forEach(playerId => {
            const startGame = {
              cmd: 'startGame',
              life: game.gameManager.life.card,
              cards: players[playerId].cards.map(card => card.card)
            };
            clients[playerId].send(JSON.stringify(startGame));
          });
        }

      }

    }
    // Player chose a card. Format => {cmd: 'playCard', card: '<card>'}
    else if (msg.cmd === 'playCard') {
      // Get Player from db
      const player = players[id];
      // Get gameId
      const gameId = player.inGame;
      // Handle Error if the player that is playing a card isn't registered to a game
      if (gameId === "") {
        const error = {cmd: 'Error', info: 'player not registered in a game', player: id};
        ws.send(JSON.stringify(error));
      }
      const cardPos = player.playCard(msg.card);
      if (cardPos !== -1) {
        // Get game from db
        const game = games[gameId];
        // Tell gameManager that a player played a card
        game.gameManager.playersPlayed++;
        // Send the opponentPlayedCard command to all players registered in this game
        // Tell them an opponent played a card
        const playedCard = {
          cmd: 'playedCard',
          payload: {
            player: id,
            name: msg.card,
            pos: cardPos
          }
        }
        // Filter out (me), do not send myself this cmd
        game.players.filter(player => player !== id).forEach(playerId => {
          clients[playerId].send(JSON.stringify(playedCard));
        });
        // Check if all Players have played their cards
        if (game.gameManager.playersPlayed === game.numOfPlayers) {
          // Calculate total Round Information and update players cards.
          game.gameManager.calRound();
          // Broadcast to every player in the game that the round has ended.
          // Hand them their set of cards.
          game.players.forEach(playerId => {
            const endRound = {
              cmd: 'endRound',
              payload: {
                winner: game.players[game.gameManager.winnerIndex],
                points: game.gameManager.roundPoints,
                myCards: players[playerId].cards.map(card => card.card)
              }
            };
            clients[playerId].send(JSON.stringify(endRound));
          });
          // Clear all information of previous round.
          game.gameManager.clearRound();
          // Check if game has ended
          if (game.gameManager.hasEnded()) {
            // Calculate the game winner
            game.gameManager.calGameWinner();
            // Broadcast to every player in the game that the game has ended
            const endGame = {
              cmd: 'endGame',
              payload: {
                winner: game.players[game.gameManager.winnerIndex]
              }
            }
            game.players.forEach(playerId => {
              clients[playerId].send(JSON.stringify(endGame));
            });
          }
        }
      }
      else {
        const error = {cmd: 'Error', info: 'Card is not a valid cardName', card: msg.card};
        ws.send(JSON.stringify(error));
      }
    }
    // Show all registered Players. Format => {cmd: 'showAllPlayers'}
    else if (msg.cmd === 'showAllPlayers') {
      ws.send('All registered Players:' + JSON.stringify(players));
    }

    // Show all registered Games. Format => {cmd: 'showAllGames'}
    else if (msg.cmd === 'showAllGames') {
      ws.send('All registered Games:' + JSON.stringify(games));
    }

    // Return Error message if it's not none of the above commands.
    else {
      ws.send('Command not recognized: ' + JSON.stringify(msg.cmd));
    }

  });

  // Handle what happens when player gets disconnected
  // TODO: Need to handle more exceptions. Ex if a player is registered in a Game
  ws.on('close', () => {
    console.log('Client disconnected')
    // Remove record of socket connections
    delete clients[id];
    // Remove player from db
    delete players[id];
    // Broadcast to everyone that a player got disconnected.
    // Send them the updated list.
    const deletePlayer = {cmd: 'deletePlayer', payload: {player: id}};
    wss.clients.forEach((client) => {
      client.send(JSON.stringify(deletePlayer));
    });

  });

});


// Broadcast the time every second

/*
setInterval(() => {
  wss.clients.forEach((client) => {
    client.send(new Date().toTimeString());
  });
}, 1000);
*/
