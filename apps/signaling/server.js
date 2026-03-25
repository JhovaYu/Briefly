const { WebSocketServer } = require('ws');
const http = require('http');

// y-webrtc provides the core bin to handle signaling message routing.
const yWebrtcServer = require('y-webrtc/bin/server.js');

console.log('Briefly Signaling Server (TuxNotas P2P) started.');
console.log('Listening for WebRTC connection routing...');
// El servidor hereda automáticamente de process.env.PORT, lo cual es perfecto para Railway.
