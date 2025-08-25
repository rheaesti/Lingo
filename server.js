const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store connected users in memory (socket.id -> username)
const connectedUsers = new Map();
const usernames = new Set();

// Store offline messages for users (username -> [messages])
const offlineMessages = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user login
  socket.on('user_login', (username) => {
    // Check if username is already taken by another socket
    const existingSocketId = Array.from(connectedUsers.entries())
      .find(([id, name]) => name === username && id !== socket.id);
    
    if (existingSocketId) {
      socket.emit('login_error', 'Username already taken');
      return;
    }

    // Remove any existing entry for this socket
    const oldUsername = connectedUsers.get(socket.id);
    if (oldUsername) {
      usernames.delete(oldUsername);
    }

    // Store user information
    connectedUsers.set(socket.id, username);
    usernames.add(username);
    
    // Emit login success
    socket.emit('login_success', username);
    
    // Check for offline messages and deliver them
    if (offlineMessages.has(username)) {
      const messages = offlineMessages.get(username);
      console.log(`Delivering ${messages.length} offline messages to ${username}`);
      
      messages.forEach(msg => {
        io.to(socket.id).emit('private_message', {
          ...msg,
          type: 'offline'
        });
      });
      
      // Clear offline messages after delivery
      offlineMessages.delete(username);
    }
    
    // Broadcast updated users list to all clients
    const usersList = Array.from(usernames);
    io.emit('users_list_update', usersList);
    
    // Broadcast new user joined (only if it's actually a new user)
    if (!oldUsername || oldUsername !== username) {
      socket.broadcast.emit('user_joined', username);
    }
    
    console.log(`User ${username} logged in on socket ${socket.id}`);
  });

  // Handle private messages
  socket.on('private_message', (data) => {
    const { to, message, from } = data;
    
    // Prevent self-messaging (optional - you can remove this if you want to allow it)
    if (from === to) {
      socket.emit('message_error', 'Cannot send message to yourself');
      return;
    }
    
    // Find the recipient's socket
    let recipientSocket = null;
    for (const [socketId, username] of connectedUsers.entries()) {
      if (username === to && socketId !== socket.id) { // Ensure it's not the same socket
        recipientSocket = socketId;
        break;
      }
    }
    
    if (recipientSocket) {
      // Send message to recipient (online)
      io.to(recipientSocket).emit('private_message', {
        from,
        message,
        timestamp: new Date().toISOString()
      });
      
      // Send confirmation to sender
      socket.emit('message_sent', {
        to,
        message,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Message sent from ${from} to ${to} (online)`);
    } else {
      // Recipient is offline - store message
      if (!offlineMessages.has(to)) {
        offlineMessages.set(to, []);
      }
      
      const messageData = {
        from,
        message,
        timestamp: new Date().toISOString()
      };
      
      offlineMessages.get(to).push(messageData);
      
      // Send confirmation to sender
      socket.emit('message_sent', {
        to,
        message,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Message stored offline from ${from} to ${to}`);
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { to, from } = data;
    
    // Find the recipient's socket
    let recipientSocket = null;
    for (const [socketId, username] of connectedUsers.entries()) {
      if (username === to) {
        recipientSocket = socketId;
        break;
      }
    }
    
    if (recipientSocket) {
      io.to(recipientSocket).emit('typing_start', { from });
    }
  });

  socket.on('typing_stop', (data) => {
    const { to, from } = data;
    
    // Find the recipient's socket
    let recipientSocket = null;
    for (const [socketId, username] of connectedUsers.entries()) {
      if (username === to) {
        recipientSocket = socketId;
        break;
      }
    }
    
    if (recipientSocket) {
      io.to(recipientSocket).emit('typing_stop', { from });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const username = connectedUsers.get(socket.id);
    
    if (username) {
      // Remove user from connected users
      connectedUsers.delete(socket.id);
      usernames.delete(username);
      
      // Broadcast updated users list
      const usersList = Array.from(usernames);
      io.emit('users_list_update', usersList);
      
      // Broadcast user left
      socket.broadcast.emit('user_left', username);
      
      console.log(`User ${username} disconnected and is now offline`);
      console.log(`Remaining online users: ${Array.from(usernames).join(', ')}`);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    connectedUsers: connectedUsers.size,
    totalUsernames: usernames.size,
    connectedUsersList: Array.from(connectedUsers.entries()),
    usernamesList: Array.from(usernames),
    offlineMessages: Object.fromEntries(offlineMessages)
  });
});

// Test offline messaging endpoint
app.get('/test-offline/:username', (req, res) => {
  const { username } = req.params;
  const testMessage = {
    from: 'test-user',
    message: `Test offline message to ${username}`,
    timestamp: new Date().toISOString()
  };
  
  if (!offlineMessages.has(username)) {
    offlineMessages.set(username, []);
  }
  
  offlineMessages.get(username).push(testMessage);
  
  res.json({ 
    message: `Test message stored for ${username}`,
    offlineMessages: Object.fromEntries(offlineMessages)
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Connected users: ${connectedUsers.size}`);
});
