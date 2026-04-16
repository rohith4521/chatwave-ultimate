require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDb } = require('./database');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e8 }); // 100MB limit for uploads
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_chatwave';

// Initialize Gemini
let ai;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

app.use(express.static('public'));
app.use(express.json());

// Audio/Image storage via Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './public/uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.mimetype.includes('audio') ? '.webm' : '');
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({ storage });

let db;
async function startServer() {
  db = await initDb();
  
  // Start express
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ChatWave Ultimate (v4) running at http://0.0.0.0:${PORT}`);
    if (ai) console.log(`🤖 Gemini AI Bot Active`);
    else console.log(`⚠️ Gemini API Key missing or default in .env, AI Bot is mocked.`);
  });
}
startServer();

// --- REST Endpoints for Auth ---
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  
  try {
    const existing = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (existing) return res.status(400).json({ error: 'Username taken' });

    const hash = await bcrypt.hash(password, 10);
    // Assign random color
    const colors = ['#6C63FF','#3B82F6','#8B5CF6','#EC4899','#F59E0B','#10B981','#EF4444','#06B6D4'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const id = uuidv4();

    await db.run('INSERT INTO users (id, username, password_hash, color) VALUES (?, ?, ?, ?)', [id, username, hash, color]);
    const token = jwt.sign({ id, username, color }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username, color });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username, color: user.color }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username, color: user.color });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Used for both images and voice notes
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname, type: req.file.mimetype });
});

// --- State tracking (in-memory parts for sockets) ---
const onlineUsers = new Map(); // socket.id -> { username, id, status, lastSeen }
const typingUsers = { global: new Set() }; // channel -> Set of usernames

// --- Socket middleware ---
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = payload; // { id, username, color }
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

// Format database message to frontend format
async function formatMessageOut(msgRow) {
  // Get reactions
  const reacts = await db.all('SELECT emoji, user_username FROM reactions WHERE message_id = ?', [msgRow.id]);
  const reactionsMap = {};
  for (const r of reacts) {
    if (!reactionsMap[r.emoji]) reactionsMap[r.emoji] = [];
    reactionsMap[r.emoji].push(r.user_username);
  }
  // Get read statuses (only relevant for DMs, but we fetch anyway)
  const reads = await db.all('SELECT read_by_username FROM read_receipts WHERE message_id = ?', [msgRow.id]);
  
  return {
    id: msgRow.id,
    channel: msgRow.channel,
    username: msgRow.sender_name,  // Frontend uses senderName or username
    senderName: msgRow.sender_name,
    recipientName: msgRow.target_user,
    text: msgRow.text,
    imageUrl: msgRow.image_url,
    voiceUrl: msgRow.voice_url,
    replyTo: msgRow.reply_to,
    deleted: msgRow.is_deleted === 1,
    edited: msgRow.is_edited === 1,
    timestamp: msgRow.timestamp,
    reactions: reactionsMap,
    read: reads.length > 0,
    delivered: true // If in DB, it's delivered
  };
}

io.on('connection', async (socket) => {
  const user = socket.user;
  console.log(`⚡  Connection: ${user.username} (${socket.id})`);

  // Track online
  for (const [id, u] of onlineUsers.entries()) {
    if (u.username === user.username) {
      onlineUsers.delete(id); // remove old socket
    }
  }
  onlineUsers.set(socket.id, { id: user.id, username: user.username, socketId: socket.id, lastSeen: Date.now() });

  const getOnlineList = () => Array.from(onlineUsers.values()).map(u => ({ username: u.username, id: u.id }));
  
  // System broadcast
  const sysMsg = { id: uuidv4(), isSystem: true, text: `${user.username} joined the chat`, timestamp: new Date().toISOString() };
  io.emit('system-message', sysMsg);
  io.emit('user-list', getOnlineList());
  socket.emit('join-success', { id: user.id, username: user.username, color: user.color });

  // History fetcher
  socket.on('request-history', async ({ channel, limit = 50 }) => {
    let rows = [];
    if (channel === 'global') {
      rows = await db.all('SELECT * FROM messages WHERE channel = ? ORDER BY timestamp DESC LIMIT ?', ['global', limit]);
    } else {
      rows = await db.all(
        'SELECT * FROM messages WHERE channel = ? AND ((sender_name = ? AND target_user = ?) OR (sender_name = ? AND target_user = ?)) ORDER BY timestamp DESC LIMIT ?', 
        ['private', user.username, channel, channel, user.username, limit]
      );
    }
    rows.reverse(); // chronological
    const messages = await Promise.all(rows.map(formatMessageOut));
    socket.emit('message-history', { channel, messages });
  });

  // Global MSG
  socket.on('chat-message', async (data) => {
    const msgId = uuidv4();
    const timestamp = new Date().toISOString();
    await db.run(
      'INSERT INTO messages (id, channel, sender_name, text, image_url, voice_url, reply_to, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [msgId, 'global', user.username, data.text || null, data.imageUrl || null, data.voiceUrl || null, data.replyTo || null, timestamp]
    );

    const msgOut = {
      id: msgId, channel: 'global', username: user.username, senderName: user.username, text: data.text,
      imageUrl: data.imageUrl, voiceUrl: data.voiceUrl, replyTo: data.replyTo, timestamp, reactions: {}, edited: false, deleted: false
    };
    io.emit('chat-message', msgOut);

    // AI Trigger
    if (data.text && data.text.trim().startsWith('@AI')) {
      const prompt = data.text.replace('@AI', '').trim();
      let aiText = "I received your message, but the Gemini API key isn't configured!";
      if (ai && prompt.length > 0) {
        try {
          const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
          aiText = result.text;
        } catch(e) { console.error("AI Error:", e); aiText = "AI Request failed."; }
      } else if (prompt.length === 0) {
        aiText = "Hi! How can I help you? Ask me anything.";
      }
      
      const aiMsgId = uuidv4();
      const aiTime = new Date().toISOString();
      await db.run(
        'INSERT INTO messages (id, channel, sender_name, text, timestamp) VALUES (?, ?, ?, ?, ?)',
        [aiMsgId, 'global', 'AI_BOT', aiText, aiTime]
      );
      io.emit('chat-message', {
        id: aiMsgId, channel: 'global', username: 'AI_BOT', senderName: 'AI_BOT', text: aiText, timestamp: aiTime,
        reactions: {}, edited: false, deleted: false
      });
    }
  });

  // Private MSG
  socket.on('private-message', async (data) => {
    const msgId = uuidv4();
    const timestamp = new Date().toISOString();
    await db.run(
      'INSERT INTO messages (id, channel, sender_name, target_user, text, image_url, voice_url, reply_to, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [msgId, 'private', user.username, data.to, data.text || null, data.imageUrl || null, data.voiceUrl || null, data.replyTo || null, timestamp]
    );

    const msgOut = {
      id: msgId, channel: 'private', senderName: user.username, recipientName: data.to, text: data.text,
      imageUrl: data.imageUrl, voiceUrl: data.voiceUrl, replyTo: data.replyTo, timestamp, reactions: {}, edited: false, deleted: false, delivered: true
    };
    
    let sentToTarget = false;
    for (const [sId, oUser] of onlineUsers.entries()) {
      if (oUser.username === data.to) {
        io.to(sId).emit('private-message', msgOut);
        sentToTarget = true;
      }
    }
    socket.emit('private-message', msgOut); // send back to self
  });

  // Edit Message
  socket.on('edit-message', async ({ id, newText }) => {
    const existing = await db.get('SELECT * FROM messages WHERE id = ? AND sender_name = ?', [id, user.username]);
    if (!existing || existing.is_deleted) return;

    await db.run('UPDATE messages SET text = ?, is_edited = 1 WHERE id = ?', [newText, id]);
    io.emit('message-edited', { messageId: id, newText });
  });

  // Delete message
  socket.on('delete-message', async ({ messageId }) => {
    const existing = await db.get('SELECT * FROM messages WHERE id = ? AND sender_name = ?', [messageId, user.username]);
    if (!existing) return;
    await db.run('UPDATE messages SET is_deleted = 1, text = NULL, image_url = NULL, voice_url = NULL WHERE id = ?', [messageId]);
    io.emit('message-deleted', { messageId });
  });

  // Reactions
  socket.on('add-reaction', async ({ messageId, emoji }) => {
    try {
      await db.run('INSERT INTO reactions (message_id, user_username, emoji) VALUES (?, ?, ?)', [messageId, user.username, emoji]);
    } catch(e) {} // unique constraint fail ok
    broadcastReactions(messageId);
  });
  socket.on('remove-reaction', async ({ messageId, emoji }) => {
    await db.run('DELETE FROM reactions WHERE message_id = ? AND user_username = ? AND emoji = ?', [messageId, user.username, emoji]);
    broadcastReactions(messageId);
  });

  async function broadcastReactions(messageId) {
    const reacts = await db.all('SELECT emoji, user_username FROM reactions WHERE message_id = ?', [messageId]);
    const usersByEmoji = {};
    for (const r of reacts) {
      if (!usersByEmoji[r.emoji]) usersByEmoji[r.emoji] = [];
      usersByEmoji[r.emoji].push(r.user_username);
    }
    const emojiStr = Object.keys(usersByEmoji).length > 0 ? Object.keys(usersByEmoji)[0] : '';
    io.emit('reaction-updated', { messageId, emoji: emojiStr, users: usersByEmoji[emojiStr] || [], by: user.username, action: 'update', allReactions: usersByEmoji });
  }

  // Read receipts
  socket.on('messages-read', async ({ messageIds, by }) => {
    for (const id of messageIds) {
      try { await db.run('INSERT INTO read_receipts (message_id, read_by_username) VALUES (?, ?)', [id, by]); } catch(e){}
      const original = await db.get('SELECT sender_name FROM messages WHERE id = ?', [id]);
      if (original) {
        for (const [sId, oUser] of onlineUsers.entries()) {
          if (oUser.username === original.sender_name) io.to(sId).emit('message-read', { messageId: id });
        }
      }
    }
  });

  // Search
  socket.on('search-messages', async ({ query }) => {
    const term = `%${query}%`;
    const rows = await db.all(`
      SELECT * FROM messages 
      WHERE text LIKE ? AND is_deleted = 0 
      AND (channel = 'global' OR sender_name = ? OR target_user = ?)
      ORDER BY timestamp DESC LIMIT 20
    `, [term, user.username, user.username]);
    const results = await Promise.all(rows.map(formatMessageOut));
    socket.emit('search-results', { query, results });
  });

  // --- WEBRTC SIGNALING ---
  socket.on('webrtc-offer', data => passWebRTCPayload('webrtc-offer', data));
  socket.on('webrtc-answer', data => passWebRTCPayload('webrtc-answer', data));
  socket.on('webrtc-candidate', data => passWebRTCPayload('webrtc-candidate', data));
  socket.on('webrtc-call-start', data => passWebRTCPayload('webrtc-call-start', data));
  socket.on('webrtc-call-action', data => passWebRTCPayload('webrtc-call-action', data));

  function passWebRTCPayload(event, data) {
    const to = data.target;
    for (const [sId, u] of onlineUsers.entries()) {
      if (u.username === to) io.to(sId).emit(event, { ...data, sender: user.username });
    }
  }

  // Typing
  socket.on('typing', ({ channel, to }) => {
    if (channel === 'global') {
      typingUsers.global.add(user.username);
      io.emit('typing', { username: user.username, channel });
    } else if (to) {
      for (const [sId, u] of onlineUsers.entries()) {
        if (u.username === to) io.to(sId).emit('typing', { username: user.username, channel: 'private' });
      }
    }
  });
  socket.on('stop-typing', ({ channel, to }) => {
    if (channel === 'global') {
      typingUsers.global.delete(user.username);
      io.emit('stop-typing', { username: user.username, channel });
    } else if (to) {
      for (const [sId, u] of onlineUsers.entries()) {
        if (u.username === to) io.to(sId).emit('stop-typing', { username: user.username, channel: 'private' });
      }
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    typingUsers.global.delete(user.username);
    io.emit('user-list', getOnlineList());
  });
});
