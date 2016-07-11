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
  ws.send('PlayerId: ' + id);


  // Handle request logic here
  ws.on('message', (message) => {
    console.log('Received:', message);

    // Parse command message
    const msg = querystring.parse(message);
    console.log(msg);

    // Delete player. Format => deletePlayer:<player>
    if(msg.cmd === 'deletePlayer') {
      const i = players.findIndex((player) => player.id === msg.player);
      players.splice(i, 1 );
      ws.send('Player deleted:' + msg.player);
    }

    // Show all registered Players. Format => showAllPlayers
    else if (msg.cmd === 'showAllPlayers') {
      ws.send('All registered Players:' + JSON.stringify(players));
    }

    else {
        ws.send('Command not recognized', JSON.stringify(msg.cmd));
    }


  });

  ws.on('close', () => {
    console.log('Client disconnected')
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