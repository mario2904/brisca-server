'use strict';

//const express = require('express');
const SocketServer = require('ws').Server;
const path = require('path');

const PORT = process.env.PORT || 3000;


const wss = new SocketServer({ port: PORT });
console.log(`Listening on port: ${ PORT }`)


wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('open', () => {
    ws.send('Connection Established :)')
  })

  // Handle request logic here
  ws.on('message', (message) => {
    console.log('received:', message)
    ws.send('received:' + message);
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
