'use strict';

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const clientOrigin = process.env.CLIENT_ORIGIN;
const io = new Server(server, {
  cors: clientOrigin ? { origin: clientOrigin, methods: ['GET', 'POST'] } : undefined,
  maxHttpBufferSize: 1e6,
});
const users = new Map();
const messageTimes = new Map();
const publicFiles = new Set([
  '/style.css',
  '/js/client.js',
  '/logo-no-background.png',
  '/awesome_chat_wing_logo_design-removebg.png',
  '/ting.mp3',
]);

app.disable('x-powered-by');
app.get('/health', (_request, response) => response.status(200).json({ status: 'ok' }));
app.get('/', (_request, response) => response.sendFile(path.join(__dirname, 'index.html')));
app.get([...publicFiles], (request, response, next) => {
  const filePath = path.join(__dirname, request.path.replace(/^\//, ''));
  response.sendFile(filePath, error => { if (error) next(error); });
});
app.use((_request, response) => response.status(404).type('text').send('Not found'));

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

function getOnlineNames() {
  return [...users.values()];
}

function tooManyMessages(socketId) {
  const now = Date.now();
  const recent = (messageTimes.get(socketId) || []).filter(time => now - time < 5000);
  if (recent.length >= 8) {
    messageTimes.set(socketId, recent);
    return true;
  }
  recent.push(now);
  messageTimes.set(socketId, recent);
  return false;
}

io.on('connection', socket => {
  socket.on('new-user-joined', value => {
    const name = cleanText(value, 32).replace(/\s+/g, ' ');
    if (!name) {
      socket.emit('chat-error', 'Choose a display name before joining.');
      return;
    }
    const previousName = users.get(socket.id);
    if (previousName === name) return;
    if (previousName && previousName !== name) socket.broadcast.emit('left', previousName);
    users.set(socket.id, name);
    socket.broadcast.emit('user-joined', name);
    io.emit('updateOnlineUsers', getOnlineNames());
  });

  socket.on('send', value => {
    const name = users.get(socket.id);
    const message = cleanText(value, 1000);
    if (!name) {
      socket.emit('chat-error', 'Join the room before sending a message.');
      return;
    }
    if (!message) return;
    if (tooManyMessages(socket.id)) {
      socket.emit('chat-error', 'You’re sending messages too quickly. Please slow down.');
      return;
    }
    socket.broadcast.emit('receive', { name, message, sentAt: Date.now() });
  });

  socket.on('typing', isTyping => {
    const name = users.get(socket.id);
    if (!name) return;
    socket.broadcast.emit('typing', { name, isTyping: Boolean(isTyping) });
  });

  socket.on('disconnect', () => {
    const name = users.get(socket.id);
    if (name) {
      users.delete(socket.id);
      socket.broadcast.emit('left', name);
      io.emit('updateOnlineUsers', getOnlineNames());
    }
    messageTimes.delete(socket.id);
  });
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, '0.0.0.0', () => {
  console.log(`BuzzTalks is listening on port ${port}`);
});

server.on('error', error => {
  console.error('BuzzTalks could not start:', error);
  process.exitCode = 1;
});
