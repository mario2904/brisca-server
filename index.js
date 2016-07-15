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


// Testing
const players = [];
const game = null;

// Save client connections
const clients = {};


wss.on('connection', (ws) => {
  console.log('Client connected');

  // Generate a random id
  const id = Moniker.choose();
  // and create a new Player with this id as username
  const newPlayer = new Player(id);
  // Save player in the db
  players.push(newPlayer);
  // Save ws socket connection mapped to player id
  clients[id] = ws;
  // Send player his username id
  const cmdNewPlayer = {cmd: 'playerId', player: id};
  ws.send(querystring.stringify(cmdNewPlayer));
  // Broadcast to all players to update their list of players. Only pass their id
  const cmdUpdatePlayers = {cmd: 'updatePlayers', players: players.map(player => {return player.id})};
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
    if(msg.cmd === 'deletePlayer') {
      const i = players.findIndex((player) => player.id === msg.player);
      // Handle Error if player is not in the db
      if (i === -1) {
        const error = {cmd: 'Error', info: 'player not found', player: msg.player};
        ws.send(querystring.stringify(error));
      }
      else {
        // Delete player from db
        players.splice(i, 1 );
        ws.send('Player deleted:' + msg.player);
      }

    }

    // Show Player information. Format => {cmd: 'getPlayerInfo', player='<player>'}
    else if (msg.cmd === 'getPlayerInfo') {
      const i = players.findIndex((player) => player.id === msg.player);
      // Handle Error if player is not in the db
      if (i === -1) {
        const error = {cmd: 'Error', info: 'player not found', player: msg.player};
        ws.send(querystring.stringify(error));
      }
      else {
        // Get player from db
        const player = players[i];
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

    // Show all registered Players. Format => {cmd: 'showAllPlayers'}
    else if (msg.cmd === 'showAllPlayers') {
      ws.send('All registered Players:' + JSON.stringify(players));
    }

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
    const i = players.findIndex((player) => player.id === id);
    players.splice(i, 1 );
    // Broadcast to everyone that a player got disconnected.
    // Send them the updated list.
    const cmdUpdatePlayers = {cmd: 'updatePlayers', players: players.map(player => {return player.id})};
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
