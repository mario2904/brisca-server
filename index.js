'use strict';

//const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');

const PORT = process.env.PORT || 3000;


const wss = new SocketServer({ port: PORT });
console.log(`Listening on port: ${ PORT }`)

// Testing
const players = [];
const game = null;

const Player = require('./player');

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.send('Connection Established :)')


  // Handle request logic here
  ws.on('message', (message) => {
    console.log('received:', message)

    // Register player. Format => newPlayer:<newplayer>
    if(message.startsWith('newPlayer')) {
      const strNewPlayer = message.split(':')[1];
      const newPlayer = new Player(strNewPlayer);
      players.push(newPlayer);
      ws.send('New player added:' + JSON.stringify(newPlayer));
    }
    // Delete player. Format => deletePlayer:<player>
    else if(message.startsWith('deletePlayer')) {
      const strPlayer = message.split(':')[1];
      const i = players.findIndex((player) => player.id === strPlayer);
      players.splice(i, 1 );
      ws.send('Player deleted:' + strPlayer);
    }

    // Show all registered Players. Format => showAllPlayers
    else if (message === 'showAllPlayers') {
      ws.send('All registered Players:' + JSON.stringify(players));
    }
    else {
        ws.send('Command not recognized');
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
