const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const users = {}; 

io.on('connection', (socket) => {
    //console.log('New client connected');

    socket.on('message', (message) => {
        io.emit('message', message);
    });

    socket.on('disconnect', () => {
       // console.log('Client disconnected');
    });
    
    //if new user joins the chat
    socket.on('new-user-joined', name => {
      //  console.log('New User', name);
        users[socket.id] = name;
        socket.broadcast.emit('user-joined', name);
    });
    //if someone sends a message, broadcast it to other people
    socket.on('send', message => {
        socket.broadcast.emit('receive', { message: message, name: users[socket.id] });
    });

    //if someone leaves the chat, let others know

    socket.on('disconnect', message => {
        socket.broadcast.emit('left', users[socket.id]);
        delete users[socket.id];
    });


});
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
app.use(express.static(__dirname));


server.listen(3000, () => console.log('Listening on port 3000'));