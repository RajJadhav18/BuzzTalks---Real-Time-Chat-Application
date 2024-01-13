const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const users = {}; 

io.on('connection', (socket) => {
    // Log a new client connection
    console.log('New client connected');

    // Listen for messages from clients and broadcast to all clients
    socket.on('message', (message) => {
        io.emit('message', message);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected');
        if (users[socket.id]) {
            const disconnectedUser = users[socket.id];
            socket.broadcast.emit('left', disconnectedUser);
            delete users[socket.id];
            io.emit('updateOnlineUsers', Object.values(users));
        }
    });

    // Handle new user joining the chat
    socket.on('new-user-joined', name => {
        console.log('New User', name);
        users[socket.id] = name;
        socket.broadcast.emit('user-joined', name);
        io.emit('updateOnlineUsers', Object.values(users));
    });

    // Handle someone sending a message, broadcast it to other people
    socket.on('send', message => {
        socket.broadcast.emit('receive', { message: message, name: users[socket.id] });
    });
});

app.use(cors());
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
app.use(express.static(__dirname));

server.listen(3000, () => console.log('Listening on port 3000'));
