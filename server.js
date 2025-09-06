require('dotenv').config({ path: '.env.local' });
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
async function getOrCreateUser(username, preferredLanguage = 'English') {
  if (!supabase) {
    console.error('❌ Supabase client not available');
    return null;
  }
  
  console.log(`🔍 getOrCreateUser called with username: ${username}, language: ${preferredLanguage}`);
  
  // Try to find existing user
  let { data: user, error } = await supabase
    .from('users')
    .select('id, username, preferred_language')
    .eq('username', username)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('getOrCreateUser: select error', error);
  }

  if (!user) {
    console.log(`📝 Creating new user: ${username} with language: ${preferredLanguage}`);
    // Create new user with language preference
    const { data: inserted, error: insertErr } = await supabase
      .from('users')
      .insert({ 
        username, 
        is_online: true,
        preferred_language: preferredLanguage
      })
      .select('id, username, preferred_language')
      .single();
    if (insertErr) {
      console.error('getOrCreateUser: insert error', insertErr);
      return null;
    }
    user = inserted;
    console.log(`✅ New user created:`, user);
  } else {
    console.log(`🔄 Updating existing user: ${username} with language: ${preferredLanguage}`);
    // Update existing user - mark online and update language preference
    const { error: updateErr } = await supabase
      .from('users')
      .update({ 
        is_online: true, 
        last_seen: new Date().toISOString(),
        preferred_language: preferredLanguage
      })
      .eq('id', user.id);
    
    if (updateErr) {
      console.error('getOrCreateUser: update error', updateErr);
      return null;
    }
    
    // Update the user object with the new language preference
    user.preferred_language = preferredLanguage;
    console.log(`✅ User updated:`, user);
  }
  
  return user;
}

async function getUserByUsername(username) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('users')
    .select('id, username, preferred_language')
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

// Language preferences are now stored directly in the users table
// No separate function needed

async function getLanguagePreference(userId) {
  if (!supabase) return 'English';
  
  const { data, error } = await supabase
    .from('users')
    .select('preferred_language')
    .eq('id', userId)
    .single();
  
  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('getLanguagePreference error', error);
    }
    return 'English'; // Default language
  }
  
  return data?.preferred_language || 'English';
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
  socket.on('user_login', async (data) => {
    const username = typeof data === 'string' ? data : data.username;
    const preferredLanguage = typeof data === 'object' && data.preferredLanguage ? data.preferredLanguage : 'English';
    
    console.log(`🔍 Login attempt - Username: ${username}, Language: ${preferredLanguage}`);
    
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
    let userRecord = await getOrCreateUser(username, preferredLanguage);
    const userId = userRecord?.id || null;
    
    if (userId) {
      usernameToUserId.set(username, userId);
      console.log(`✅ User ${username} created/updated in database with language: ${preferredLanguage}`);
    } else {
      console.error(`❌ Failed to create/update user ${username} in database`);
    }

    // Store user information
    connectedUsers.set(socket.id, { username, userId, preferredLanguage });
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

    console.log(`User ${username} logged in on socket ${socket.id} with language preference: ${preferredLanguage}`);
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

    // Find the recipient's socket and get their language preference
    let recipientSocket = null;
    let recipientLanguage = 'English'; // Default language
    for (const [socketId, info] of connectedUsers.entries()) {
      if (info.username === to && socketId !== socket.id) {
        recipientSocket = socketId;
        recipientLanguage = info.preferredLanguage || 'English';
        break;
      }
    }

    // Get sender's language preference
    const senderLanguage = sender?.preferredLanguage || 'English';

    if (recipientSocket) {
      // Auto-translate message for recipient if languages are different
      let translatedMessage = message;
      if (senderLanguage !== recipientLanguage) {
        try {
          const translationResponse = await fetch('http://localhost:5000/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: message,
              sourceLanguage: senderLanguage,
              targetLanguage: recipientLanguage
            })
          });

          if (translationResponse.ok) {
            const translationResult = await translationResponse.json();
            translatedMessage = translationResult.translatedText;
            console.log(`Auto-translated message from ${senderLanguage} to ${recipientLanguage}: ${message} -> ${translatedMessage}`);
          }
        } catch (error) {
          console.error('Auto-translation failed:', error);
          // Continue with original message if translation fails
        }
      }

      // Send translated message to recipient (online)
      io.to(recipientSocket).emit('private_message', {
        from,
        message: translatedMessage,
        originalMessage: message,
        originalLanguage: senderLanguage,
        translatedLanguage: recipientLanguage,
        isTranslated: senderLanguage !== recipientLanguage,
        timestamp: persisted.created_at || new Date().toISOString()
      });

      // Send confirmation to sender (original message)
      socket.emit('message_sent', {
        to,
        message,
        timestamp: persisted.created_at || new Date().toISOString()
      });

      console.log(`Message sent from ${from} to ${to} (online) - Auto-translated: ${senderLanguage} -> ${recipientLanguage}`);
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
    
    // Get current user's language preference
    const currentUserLanguage = me.preferredLanguage || 'English';
    const otherUserLanguage = other.preferred_language || 'English';
    
    const history = await Promise.all(rows.map(async (r) => {
      const isReceived = r.sender_id !== me.userId;
      let message = r.content;
      let isTranslated = false;
      let originalLanguage = currentUserLanguage;
      let translatedLanguage = currentUserLanguage;
      
      // If it's a received message and languages are different, translate it
      if (isReceived && currentUserLanguage !== otherUserLanguage) {
        try {
          const translationResponse = await fetch('http://localhost:5000/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: r.content,
              sourceLanguage: otherUserLanguage,
              targetLanguage: currentUserLanguage
            })
          });

          if (translationResponse.ok) {
            const translationResult = await translationResponse.json();
            message = translationResult.translatedText;
            isTranslated = true;
            originalLanguage = otherUserLanguage;
            translatedLanguage = currentUserLanguage;
          }
        } catch (error) {
          console.error('History translation failed:', error);
        }
      }
      
      return {
        message: message,
        timestamp: r.created_at,
        type: isReceived ? 'received' : 'sent',
        isTranslated: isTranslated,
        originalLanguage: originalLanguage,
        translatedLanguage: translatedLanguage
      };
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

// Translation endpoint using Sarvam-Translate
app.post('/translate', async (req, res) => {
  try {
    console.log('🔄 Translation request received:', req.body);
    const { text, targetLanguage, sourceLanguage = 'auto' } = req.body;
    
    if (!text || !targetLanguage) {
      console.log('❌ Missing required fields:', { text, targetLanguage, sourceLanguage });
      return res.status(400).json({ error: 'Text and target language are required' });
    }
    
    console.log('🔄 Processing translation:', { text, sourceLanguage, targetLanguage });

    // Call Sarvam-Translate API directly
    const sarvamApiKey = process.env.SARVAM_API_KEY || 'sk_wsi7w8tb_It8xiqE4fdrxA44Bb0lbxjVg';
    
    if (!sarvamApiKey || sarvamApiKey === 'sk_wsi7w8tb_It8xiqE4fdrxA44Bb0lbxjVg') {
      console.log('⚠️ Using fallback API key. Please set SARVAM_API_KEY in .env.local');
    }
    
    const response = await fetch('https://api.sarvam.ai/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sarvamApiKey}`
      },
      body: JSON.stringify({
        text: text,
        source_language: sourceLanguage,
        target_language: targetLanguage
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Sarvam API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Translation API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    res.json({ 
      translatedText: result.translated_text || result.text || 'Translation failed',
      sourceLanguage: result.source_language || sourceLanguage,
      targetLanguage: result.target_language || targetLanguage
    });

  } catch (error) {
    console.error('Translation error:', error);
    console.log('Error details:', {
      message: error.message,
      stack: error.stack,
      text,
      sourceLanguage,
      targetLanguage
    });
    
    // Fallback: Return a mock translation for testing
    const mockTranslations = {
      'English': {
        'Malayalam': `[Translated to Malayalam] ${text}`,
        'Hindi': `[Translated to Hindi] ${text}`,
        'Tamil': `[Translated to Tamil] ${text}`,
        'Bengali': `[Translated to Bengali] ${text}`,
        'Gujarati': `[Translated to Gujarati] ${text}`,
        'Telugu': `[Translated to Telugu] ${text}`,
        'Kannada': `[Translated to Kannada] ${text}`,
        'Punjabi': `[Translated to Punjabi] ${text}`,
        'Marathi': `[Translated to Marathi] ${text}`,
        'Odia': `[Translated to Odia] ${text}`
      },
      'Malayalam': {
        'English': `[Translated to English] ${text}`,
        'Hindi': `[Translated to Hindi] ${text}`,
        'Tamil': `[Translated to Tamil] ${text}`
      }
    };
    
    const fallbackTranslation = mockTranslations[sourceLanguage]?.[targetLanguage] || 
                               `[Translation failed - API error] ${text}`;
    
    console.log(`🔄 Using fallback translation: ${sourceLanguage} -> ${targetLanguage}`);
    console.log(`🔄 Fallback result: ${fallbackTranslation}`);
    
    res.json({ 
      translatedText: fallbackTranslation,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      isFallback: true
    });
  }
});

// Test offline messaging endpoint
// (legacy) offline test route removed; messages are persisted in DB

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Connected users: ${connectedUsers.size}`);
});
