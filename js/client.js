(() => {
  const socket = io({ autoConnect: false, reconnection: true, reconnectionAttempts: Infinity });
  const form = document.getElementById('send-container');
  const messageInput = document.getElementById('messageInp');
  const sendButton = form.querySelector('button[type="submit"]');
  const messages = document.getElementById('messages');
  const chatContent = document.getElementById('chat-content');
  const welcomeCard = document.getElementById('welcome-card');
  const gate = document.getElementById('name-gate');
  const nameForm = document.getElementById('name-form');
  const nameInput = document.getElementById('name-input');
  const gateError = document.getElementById('gate-error');
  const status = document.getElementById('connection-status');
  const statusLabel = status.querySelector('.connection-label');
  const profileName = document.getElementById('profile-name');
  const profileAvatar = document.getElementById('profile-avatar');
  const participants = document.getElementById('participants');
  const onlineCount = document.getElementById('online-count');
  const peopleCount = document.getElementById('people-count');
  const memberCount = document.getElementById('member-count');
  const typingIndicator = document.getElementById('typing-indicator');
  const typingLabel = document.getElementById('typing-label');
  const sound = document.getElementById('message-sound');
  const typingUsers = new Set();
  let currentName = '';
  let typingTimeout;
  let typingHideTimeout;

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  }

  function setConnection(state, label) {
    status.classList.remove('is-connected', 'is-disconnected');
    if (state) status.classList.add(state);
    statusLabel.textContent = label;
  }

  function scrollToLatest() {
    chatContent.scrollTop = chatContent.scrollHeight;
  }

  function addSystemMessage(text) {
    const notice = document.createElement('p');
    notice.className = 'system-message';
    notice.textContent = text;
    messages.appendChild(notice);
    scrollToLatest();
  }

  function addMessage(author, text, mine = false, timestamp = Date.now()) {
    welcomeCard.hidden = true;
    const row = document.createElement('article');
    row.className = `message-row${mine ? ' is-mine' : ''}`;

    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.textContent = initials(author);
    avatar.setAttribute('aria-hidden', 'true');

    const body = document.createElement('div');
    body.className = 'message-body';
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    const authorLabel = document.createElement('span');
    authorLabel.className = 'message-author';
    authorLabel.textContent = author;
    const time = document.createElement('time');
    time.className = 'message-time';
    time.dateTime = new Date(timestamp).toISOString();
    time.textContent = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(timestamp);
    meta.append(authorLabel, time);

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;
    body.append(meta, bubble);
    row.append(avatar, body);
    messages.appendChild(row);
    scrollToLatest();

    if (!mine) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  }

  function updateParticipants(users) {
    const names = Array.isArray(users) ? [...new Set(users.filter(name => typeof name === 'string' && name.trim()))] : [];
    participants.replaceChildren();
    if (!names.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-members';
      empty.innerHTML = "You're the first one here.<br>Invite someone to chat.";
      participants.appendChild(empty);
    }
    for (const name of names) {
      const row = document.createElement('div');
      row.className = 'participant';
      row.setAttribute('role', 'listitem');
      const avatar = document.createElement('span');
      avatar.className = 'avatar';
      avatar.textContent = initials(name);
      avatar.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.className = 'participant-name';
      label.textContent = name;
      row.append(avatar, label);
      if (name === currentName) {
        const you = document.createElement('span');
        you.className = 'participant-you';
        you.textContent = 'you';
        row.appendChild(you);
      }
      participants.appendChild(row);
    }
    onlineCount.textContent = `${names.length} online`;
    peopleCount.textContent = String(names.length);
    memberCount.textContent = String(names.length);
  }

  function showTyping() {
    const names = [...typingUsers];
    if (!names.length) {
      typingIndicator.hidden = true;
      return;
    }
    typingLabel.textContent = names.length === 1 ? `${names[0]} is typing` : `${names.slice(0, 2).join(' and ')} are typing`;
    typingIndicator.hidden = false;
    clearTimeout(typingHideTimeout);
    typingHideTimeout = setTimeout(() => {
      typingUsers.clear();
      typingIndicator.hidden = true;
    }, 2200);
    scrollToLatest();
  }

  function submitName(event) {
    event.preventDefault();
    const name = nameInput.value.trim().replace(/\s+/g, ' ').slice(0, 32);
    if (!name) {
      gateError.textContent = 'Enter a display name to join.';
      gateError.hidden = false;
      nameInput.focus();
      return;
    }
    currentName = name;
    profileName.textContent = name;
    profileAvatar.textContent = initials(name);
    gate.hidden = true;
    messageInput.disabled = false;
    sendButton.disabled = false;
    setConnection('', 'Connecting');
    if (socket.connected) socket.emit('new-user-joined', currentName);
    else socket.connect();
    messageInput.focus();
  }

  nameForm.addEventListener('submit', submitName);
  nameInput.addEventListener('input', () => { gateError.hidden = true; });
  nameInput.focus();

  document.getElementById('profile-button').addEventListener('click', () => {
    if (currentName) nameInput.value = currentName;
    gate.hidden = false;
    nameInput.focus();
    nameInput.select();
  });

  socket.on('connect', () => {
    setConnection('is-connected', 'Connected');
    messageInput.disabled = false;
    sendButton.disabled = false;
    socket.emit('new-user-joined', currentName);
    messageInput.focus();
  });

  socket.on('disconnect', () => {
    setConnection('is-disconnected', 'Reconnecting');
    messageInput.disabled = true;
    sendButton.disabled = true;
    typingUsers.clear();
    typingIndicator.hidden = true;
  });

  socket.on('connect_error', () => setConnection('is-disconnected', 'Connection issue'));
  socket.on('chat-error', message => addSystemMessage(message));
  socket.on('updateOnlineUsers', updateParticipants);
  socket.on('user-joined', name => addSystemMessage(`${name} joined the room`));
  socket.on('left', name => addSystemMessage(`${name} left the room`));
  socket.on('receive', data => {
    if (data && typeof data.name === 'string' && typeof data.message === 'string') addMessage(data.name, data.message);
  });
  socket.on('typing', ({ name, isTyping }) => {
    if (!name || name === currentName) return;
    if (isTyping) typingUsers.add(name);
    else typingUsers.delete(name);
    showTyping();
  });

  messageInput.addEventListener('input', () => {
    if (!socket.connected || !currentName) return;
    socket.emit('typing', true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => socket.emit('typing', false), 1200);
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const message = messageInput.value.trim();
    if (!message || !socket.connected) return;
    const sentAt = Date.now();
    addMessage(currentName, message, true, sentAt);
    socket.emit('send', message);
    messageInput.value = '';
    clearTimeout(typingTimeout);
    socket.emit('typing', false);
    messageInput.focus();
  });
})();
