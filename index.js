'use strict';

//const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');

const PORT = process.env.PORT || 3000;


const wss = new SocketServer({ port: PORT });
console.log(`Listening on port: ${ PORT }`)

// QueryString Parser
const querystring = require('querystring');
// Random name Generator
const Moniker = require('moniker');

const Player = require('./player');
const GameManager = require('./gameManager')


// Tables in db
const players = {}; // Schema: id: '<playerId>' => player: '<player>'
const games = {};   // Schema: id: '<gameId>' => {players: [playerId:String, ...], numOfPlayers: <size: int>}

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
  // Send player his username id
  const cmdNewPlayer = {cmd: 'playerId', player: id};
  ws.send(querystring.stringify(cmdNewPlayer));
  // Broadcast to all players to update their list of players. Only pass their id
  const cmdUpdatePlayers = {cmd: 'updatePlayers', players: Object.keys(players)};
  wss.clients.forEach((client) => {
    client.send(querystring.stringify(cmdUpdatePlayers));
  });

  // Handle request logic here
  ws.on('message', (message) => {
    console.log('Received:', message);

    // Parse command message
    const msg = querystring.parse(message);
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
        ws.send(querystring.stringify(error));
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
        ws.send(querystring.stringify(error));
      }
      else {
        // Builld the response
        const playerInfo = {
          cmd: 'playerInfo',
          player: player.id,
          inGame: player.inGame,
          points: player.points,
          gamesWon: player.gamesWon,
          gamesLost: player.gamesLost
        };
        ws.send(querystring.stringify(playerInfo));
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
      // Build queryString to update players registered in that game
      const updateGameInfo = {
        cmd: 'updateGameInfo',
        gameId: gameId,
        numOfPlayers: games[gameId].numOfPlayers,
        players: games[gameId].players
      };
      // Send the updated game information
      ws.send(querystring.stringify(updateGameInfo));
      // Generate new gameId
      gameId = (parseInt(gameId) + 1).toString();
    }
    // Request another player to play. Format => {cmd:'askToPlay', playerTo: '<playerTo>'}
    else if (msg.cmd === 'askToPlay') {
      // Get player from db
      const player = players[msg.playerTo];
      // Handle Error if playerTo is not in the db
      if (player === undefined) {
        const error = {cmd: 'Error', info: 'player not found', player: msg.playerTo};
        ws.send(querystring.stringify(error));
      }
      // Handle Error if the player that is requesting isn't registered to a game
      else if (players[id].inGame === "") {
        const error = {cmd: 'Error', info: 'player not registered in a game', player: id};
        ws.send(querystring.stringify(error));
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
        clients[msg.playerTo].send(querystring.stringify(requestToPlay));

      }

    }
    // Accept a given request to play. Format => {cmd: 'acceptRequestToPlay', gameId: '<gameId>'}
    else if (msg.cmd === 'acceptRequestToPlay') {
      // Handle Error if game is not in the db
      if (games[msg.gameId] === undefined) {
        const error = {cmd: 'Error', info: 'game not found', gameId: msg.gameId};
        ws.send(querystring.stringify(error));
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
          clients[player].send(querystring.stringify(updateGameInfo));
        });
        // TODO: check if it has reached the game.numOfPlayers === game.players.length
        if (game.numOfPlayers === game.players.length) {
          // Get all players information and store them in new array
          const gamePlayers = game.players.map(playerId => players[playerId])
          // Initialize game
          game.gameManager = new GameManager(gamePlayers);
          // Send a message to all players registered in this game
          // Tell them the game is ready to start
          const startGame = {cmd: 'startGame'}
          // Send the start game command to all players registered in this game
          // and tell them their initial cards (hand)
          game.players.forEach(playerId => {
            const startGame = {
              cmd: 'startGame',
              life: game.gameManager.life.card,
              cards: players[playerId].cards.map(card => card.card)
            };
            clients[playerId].send(querystring.stringify(startGame));
          });
        }

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
  ws.on('close', () => {
    console.log('Client disconnected')
    // Remove record of socket connections
    delete clients[id];
    // Remove player from db
    delete players[id];
    // Broadcast to everyone that a player got disconnected.
    // Send them the updated list.
    const cmdUpdatePlayers = {cmd: 'updatePlayers', players: Object.keys(players)};
    wss.clients.forEach((client) => {
      client.send(querystring.stringify(cmdUpdatePlayers));
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
