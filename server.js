require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

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

// Supabase client (server-side) — use Service Role key only (ignore RLS)
// WARNING: Hardcoded credentials for local dev per request. Do not commit to production.
const SUPABASE_URL = 'https://lmkejdtxdxmkepfogilj.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxta2VqZHR4ZHhta2VwZm9naWxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjE3NDQ2MCwiZXhwIjoyMDcxNzUwNDYwfQ.g70mZeLkQM-cnd_t_irrF0-Wwv_xPmk7BqfibQhVEy0"
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;
if (!supabase) {
  console.error('[Startup] Supabase Service Role not configured. Set SUPABASE_SERVICE_ROLE_KEY in environment to enable DB persistence.');
}

// Helpers for DB operations
async function getOrCreateUser(username) {
  if (!supabase) return null;
  // Try to find existing user
  let { data: user, error } = await supabase
    .from('users')
    .select('id, username')
    .eq('username', username)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('getOrCreateUser: select error', error);
  }

  if (!user) {
    const { data: inserted, error: insertErr } = await supabase
      .from('users')
      .insert({ username, is_online: true })
      .select('id, username')
      .single();
    if (insertErr) {
      console.error('getOrCreateUser: insert error', insertErr);
      return null;
    }
    return inserted;
  } else {
    // Mark online
    await supabase
      .from('users')
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq('id', user.id);
    return user;
  }
}

async function getUserByUsername(username) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('users')
    .select('id, username')
    .eq('username', username)
    .single();
  if (error) {
    if (error.code !== 'PGRST116') console.error('getUserByUsername error', error);
    return null;
  }
  return data;
}

async function getOrCreateChatRoom(userAId, userBId) {
  if (!supabase) return null;
  const [user1_id, user2_id] = [userAId, userBId].sort();
  let { data: room, error } = await supabase
    .from('chat_rooms')
    .select('id, user1_id, user2_id')
    .eq('user1_id', user1_id)
    .eq('user2_id', user2_id)
    .single();
  if (room) return room;
  if (error && error.code !== 'PGRST116') {
    console.error('getOrCreateChatRoom: select error', error);
  }
  const { data: inserted, error: insertErr } = await supabase
    .from('chat_rooms')
    .insert({ user1_id, user2_id })
    .select('id, user1_id, user2_id')
    .single();
  if (insertErr) {
    console.error('getOrCreateChatRoom: insert error', insertErr);
    return null;
  }
  return inserted;
}

async function insertMessage(chat_room_id, sender_id, content) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('messages')
    .insert({ chat_room_id, sender_id, content, message_type: 'text' })
    .select('id, chat_room_id, sender_id, content, created_at')
    .single();
  if (error) {
    console.error('insertMessage error', error);
    return null;
  }
  return data;
}

async function getMessages(chat_room_id) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, content, created_at')
    .eq('chat_room_id', chat_room_id)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('getMessages error', error);
    return [];
  }
  return data || [];
}

// Store connected users in memory (socket.id -> { username, userId })
const connectedUsers = new Map();
const usernames = new Set();
const usernameToUserId = new Map();

// Store offline messages for users (username -> [messages])
const offlineMessages = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user login
  socket.on('user_login', async (username) => {
    // If username already connected on another socket, drop the old mapping (prefer latest connection)
    for (const [id, info] of Array.from(connectedUsers.entries())) {
      if (info.username === username && id !== socket.id) {
        connectedUsers.delete(id);
        // No need to alter usernames Set as it's unique per name
        try { io.to(id).disconnect(true); } catch {}
      }
    }

    // Remove any existing entry for this socket
    const oldInfo = connectedUsers.get(socket.id);
    if (oldInfo?.username) {
      usernames.delete(oldInfo.username);
    }

    // Ensure user exists in DB and mark online
    let userRecord = await getOrCreateUser(username);
    const userId = userRecord?.id || null;
    if (userId) {
      usernameToUserId.set(username, userId);
    }

    // Store user information
    connectedUsers.set(socket.id, { username, userId });
    usernames.add(username);

    // Emit login success
    socket.emit('login_success', username);

    // No offline inbox; messages are persisted in DB and will be fetched on demand

    // Broadcast updated users list to all clients
    const usersList = Array.from(usernames);
    io.emit('users_list_update', usersList);

    // Broadcast new user joined (only if it's actually a new user)
    if (!oldInfo?.username || oldInfo.username !== username) {
      socket.broadcast.emit('user_joined', username);
    }

    console.log(`User ${username} logged in on socket ${socket.id}`);
  });

  // Handle private messages
  socket.on('private_message', async (data) => {
    const { to, message, from } = data;

    // Prevent self-messaging (optional - you can remove this if you want to allow it)
    if (from === to) {
      socket.emit('message_error', 'Cannot send message to yourself');
      return;
    }

    // Resolve sender/recipient users
    const sender = connectedUsers.get(socket.id) || { username: from, userId: usernameToUserId.get(from) };
    let recipientUserId = usernameToUserId.get(to);
    if (!recipientUserId) {
      const found = await getUserByUsername(to);
      if (found) {
        recipientUserId = found.id;
        usernameToUserId.set(to, found.id);
      }
    }

    // Persist message in DB first; only deliver if saved
    let persisted = null;
    if (sender?.userId && recipientUserId) {
      const room = await getOrCreateChatRoom(sender.userId, recipientUserId);
      if (room?.id) {
        persisted = await insertMessage(room.id, sender.userId, message);
      }
    }
    if (!persisted) {
      socket.emit('message_error', 'Database unavailable: message not saved');
      return;
    }

    // Find the recipient's socket
    let recipientSocket = null;
    for (const [socketId, info] of connectedUsers.entries()) {
      if (info.username === to && socketId !== socket.id) {
        recipientSocket = socketId;
        break;
      }
    }

    if (recipientSocket) {
      // Send message to recipient (online)
      io.to(recipientSocket).emit('private_message', {
        from,
        message,
        timestamp: persisted.created_at || new Date().toISOString()
      });

      // Send confirmation to sender
      socket.emit('message_sent', {
        to,
        message,
        timestamp: persisted.created_at || new Date().toISOString()
      });

      console.log(`Message sent from ${from} to ${to} (online)`);
    } else {
      // Recipient offline: confirmation to sender; message already persisted in DB
      socket.emit('message_sent', {
        to,
        message,
        timestamp: persisted.created_at || new Date().toISOString()
      });
      console.log(`Message persisted for offline delivery from ${from} to ${to}`);
    }
  });

  // Retrieve chat history between current user and another username
  socket.on('fetch_history', async (data) => {
    const { with: otherUsername, for: requester } = data;
    const me = connectedUsers.get(socket.id) || { username: requester, userId: usernameToUserId.get(requester) };
    if (!me?.userId) return;
    let other = await getUserByUsername(otherUsername);
    if (!other) return;
    const room = await getOrCreateChatRoom(me.userId, other.id);
    if (!room?.id) return;
    const rows = await getMessages(room.id);
    const history = rows.map(r => ({
      message: r.content,
      timestamp: r.created_at,
      type: r.sender_id === me.userId ? 'sent' : 'received'
    }));
    socket.emit('chat_history', { with: otherUsername, messages: history });
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { to, from } = data;

    // Find the recipient's socket
    let recipientSocket = null;
    for (const [socketId, info] of connectedUsers.entries()) {
      if (info.username === to) {
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
    for (const [socketId, info] of connectedUsers.entries()) {
      if (info.username === to) {
        recipientSocket = socketId;
        break;
      }
    }

    if (recipientSocket) {
      io.to(recipientSocket).emit('typing_stop', { from });
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    const info = connectedUsers.get(socket.id);
    const username = info?.username;
    const userId = info?.userId;
    if (username) {
      // Remove user from connected users
      connectedUsers.delete(socket.id);
      usernames.delete(username);

      // Mark offline in DB (best-effort)
      if (supabase && userId) {
        await supabase
          .from('users')
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq('id', userId);
      }

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
    dbEnabled: Boolean(supabase)
  });
});

// Database connectivity check (does not expose secrets)
app.get('/db-check', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ ok: false, reason: 'Supabase client not configured', env: {
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    }});
  }
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      return res.status(502).json({ ok: false, reason: 'Query failed', error });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ ok: false, reason: 'Fetch failed', error: String(e) });
  }
});

// Test offline messaging endpoint
// (legacy) offline test route removed; messages are persisted in DB

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Connected users: ${connectedUsers.size}`);
});
