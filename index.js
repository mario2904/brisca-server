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


// Tables in db
const players = {}; // Schema: id: '<playerId>' => player: '<player>'
const games = {};   // Schema: id: '<gameId>' => players: []

// Save client connections
const clients = {};

// Game Id Counter (Later change for a random uuid generator)
var gameId = 0;


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
          isPlaying: player.isPlaying,
          points: player.points,
          gamesWon: player.gamesWon,
          gamesLost: player.gamesLost
        }
        ws.send(querystring.stringify(playerInfo));
      }

    }

    // Request another player to play. Format => {cmd:'askToPlay', playerFrom: '<playerFrom>', playerTo: '<playerTo>'}
    // IMPORTANT: For now. the game is created here. Later on it will be moved to it's
    // own function to accomodate games of more than 2 players.
    else if (msg.cmd === 'askToPlay') {
      // Get player from db
      const player = players[msg.playerTo];
      // Handle Error if playerTo is not in the db
      if (player === undefined) {
        const error = {cmd: 'Error', info: 'player not found', player: msg.playerTo};
        ws.send(querystring.stringify(error));
      }

      else {
        // Create a new 'Game' and save the players (first one is the creator)
        games[gameId] = [players[msg.playerFrom]];

        const generatedGameId = {
          cmd: 'gameId',
          gameId: gameId
        }
        // Send the generated gameId
        ws.send(querystring.stringify(generatedGameId));

        // Build the request
        const requestToPlay = {
          cmd: 'requestToPlay',
          playerFrom: msg.playerFrom,
          gameId: gameId
        };
        // Request playerTo to play a game
        clients[msg.playerTo].send(querystring.stringify(requestToPlay));

        // Generate new gameId
        gameId++;
      }

    }

    // Accept a given request to play. Format => {cmd: 'acceptRequestToPlay', gameId: '<gameId>'}
    else if (msg.cmd === 'acceptRequestToPlay'){
      // Search for the game with id -> msg.gameId
      const game = games[msg.gameId]
      // Handle Error if game is not in the db
      if (game === undefined) {
        const error = {cmd: 'Error', info: 'game not found', gameId: msg.gameId};
        ws.send(querystring.stringify(error));
      }
      else {
        // Search myself in the db and add it to the game with id -> msg.gameId
        game.push(players[id]);
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
