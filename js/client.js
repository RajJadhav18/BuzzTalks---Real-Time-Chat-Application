    const socket = io();
    const form = document.getElementById('send-container');
    const messageInput = document.getElementById('messageInp');
    const messageContainer = document.querySelector(".container");

    var audio = new Audio('ting.mp3');

       // function that will append new events to the container
        const append=(message,position)=>{
        const messageElement=document.createElement('div');
        messageElement.innerText=message;
        messageElement.classList.add('message');
        messageElement.classList.add(position);
        messageContainer.append(messageElement);
        //play sound if the message is on received side
        if(position=='left'){
            audio.play();
        }
    };

    //if the form gets submitted, send server the message
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = messageInput.value;
        append(`You: ${message}`, 'right');
        socket.emit('send', message);
        messageInput.value = '';
    }); 
    
    // ask new user for his/her name and let the server know
    const name = prompt('Enter your name');
    socket.emit('new-user-joined', name);

    //if new user joins the chat, receive his/her name from the server
    socket.on('user-joined', name => {
       // console.log(`User ${name} joined the chat`);
        append(`${name} joined the chat`, 'right');
    });

    //if someone sends a message, broadcast it to other people
    socket.on('receive', data => {
        // console.log(`User ${name} joined the chat`);
         append(`${data.name}: ${data.message}`, 'left');
     });

    //if someone leaves the chat, let others know
    socket.on('left', name => {
    // console.log(`User ${name} joined the chat`);
    append(`${name} left the chat`, 'left');
    });