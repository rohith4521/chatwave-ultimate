// ============================================================
//  ChatWave Ultimate — Real-Time Chat Server
//  Reactions, Replies, Image Upload, Read Receipts, Search
// ============================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('Only images are allowed'));
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// ── Image Upload Endpoint ───────────────────────────────
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname });
});

// ── Data Stores ─────────────────────────────────────────
const users = new Map();            // socketId → { username, joinedAt }
const usernameToSocket = new Map(); // username → socketId
const globalMessages = [];           // capped at MAX_GLOBAL
const dmMessages = new Map();        // "alice|bob" → [messages]
const lastSeenMap = new Map();       // username → ISO string
const reactions = new Map();         // messageId → { emoji: Set<username> }
const readReceipts = new Map();      // messageId → Set<username>

const MAX_GLOBAL = 500;
const MAX_DM = 200;

function dmKey(a, b) { return [a, b].sort().join('|'); }
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function onlineList() {
  return Array.from(users.entries()).map(([id, u]) => ({
    id, username: u.username
  }));
}

function lastSeenObj() {
  const o = {};
  lastSeenMap.forEach((t, n) => { o[n] = t; });
  return o;
}

function getReactions(msgId) {
  const r = reactions.get(msgId);
  if (!r) return {};
  const out = {};
  r.forEach((users, emoji) => { out[emoji] = Array.from(users); });
  return out;
}

function enrichMessage(msg) {
  return { ...msg, reactions: getReactions(msg.id) };
}

// ── Socket.IO ───────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`⚡  New connection: ${socket.id}`);

  // ── User joins ──
  socket.on('user-join', (username) => {
    const name = (username || '').trim().slice(0, 30);
    if (!name) return;

    users.set(socket.id, { username: name, joinedAt: Date.now() });
    usernameToSocket.set(name, socket.id);
    lastSeenMap.delete(name);

    // System message
    const sysMsg = {
      id: `sys-${uid()}`,
      text: `${name} joined the chat`,
      timestamp: new Date().toISOString(),
      channel: 'global',
      isSystem: true
    };
    globalMessages.push(sysMsg);
    if (globalMessages.length > MAX_GLOBAL) globalMessages.shift();
    socket.broadcast.emit('system-message', sysMsg);

    // Send to joining user
    socket.emit('join-success', { id: socket.id, username: name });
    socket.emit('message-history', {
      channel: 'global',
      messages: globalMessages.map(enrichMessage)
    });

    // Broadcast lists
    io.emit('user-list', onlineList());
    io.emit('last-seen-data', lastSeenObj());

    console.log(`✅  ${name} joined  (${users.size} online)`);
  });

  // ── Global chat message ──
  socket.on('chat-message', (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    let text, replyTo, imageUrl, imageName;
    if (typeof data === 'string') {
      text = data.trim();
    } else {
      text = (data.text || '').trim();
      replyTo = data.replyTo || null;
      imageUrl = data.imageUrl || null;
      imageName = data.imageName || null;
    }
    if (!text && !imageUrl) return;

    const payload = {
      id: `msg-${uid()}`,
      username: user.username,
      text,
      timestamp: new Date().toISOString(),
      channel: 'global',
      deleted: false,
      replyTo,
      imageUrl,
      imageName,
      reactions: {}
    };
    globalMessages.push(payload);
    if (globalMessages.length > MAX_GLOBAL) globalMessages.shift();
    io.emit('chat-message', payload);
  });

  // ── Private message (to = username) ──
  socket.on('private-message', ({ to, text: rawText, replyTo, imageUrl, imageName }) => {
    const sender = users.get(socket.id);
    if (!sender) return;
    const text = (rawText || '').trim();
    if (!text && !imageUrl) return;
    if (!to) return;

    const payload = {
      id: `dm-${uid()}`,
      senderName: sender.username,
      recipientName: to,
      text,
      timestamp: new Date().toISOString(),
      channel: 'private',
      deleted: false,
      replyTo,
      imageUrl,
      imageName,
      reactions: {},
      delivered: false,
      read: false
    };

    const key = dmKey(sender.username, to);
    if (!dmMessages.has(key)) dmMessages.set(key, []);
    const arr = dmMessages.get(key);
    arr.push(payload);
    if (arr.length > MAX_DM) arr.shift();

    const toSocket = usernameToSocket.get(to);
    if (toSocket) {
      payload.delivered = true;
      io.to(toSocket).emit('private-message', payload);
    }
    socket.emit('private-message', payload);
  });

  // ── DM history request ──
  socket.on('request-dm-history', ({ withUser }) => {
    const user = users.get(socket.id);
    if (!user || !withUser) return;
    const key = dmKey(user.username, withUser);
    socket.emit('dm-history', {
      withUser,
      messages: (dmMessages.get(key) || []).map(enrichMessage)
    });
  });

  // ── Reactions ──
  socket.on('add-reaction', ({ messageId, emoji }) => {
    const user = users.get(socket.id);
    if (!user || !messageId || !emoji) return;

    if (!reactions.has(messageId)) reactions.set(messageId, new Map());
    const msgReactions = reactions.get(messageId);
    if (!msgReactions.has(emoji)) msgReactions.set(emoji, new Set());
    msgReactions.get(emoji).add(user.username);

    io.emit('reaction-updated', {
      messageId,
      emoji,
      users: Array.from(msgReactions.get(emoji)),
      action: 'add',
      by: user.username
    });
  });

  socket.on('remove-reaction', ({ messageId, emoji }) => {
    const user = users.get(socket.id);
    if (!user || !messageId || !emoji) return;

    const msgReactions = reactions.get(messageId);
    if (!msgReactions || !msgReactions.has(emoji)) return;
    msgReactions.get(emoji).delete(user.username);
    if (msgReactions.get(emoji).size === 0) msgReactions.delete(emoji);

    io.emit('reaction-updated', {
      messageId,
      emoji,
      users: msgReactions.has(emoji) ? Array.from(msgReactions.get(emoji)) : [],
      action: 'remove',
      by: user.username
    });
  });

  // ── Read receipts ──
  socket.on('messages-read', ({ messageIds, by }) => {
    const user = users.get(socket.id);
    if (!user) return;
    messageIds.forEach(id => {
      // Find message and mark as read
      for (const ch of [globalMessages, ...dmMessages.values()]) {
        const msg = ch.find(m => m.id === id);
        if (msg && msg.senderName && msg.senderName !== user.username) {
          msg.read = true;
          const senderSocket = usernameToSocket.get(msg.senderName);
          if (senderSocket) {
            io.to(senderSocket).emit('message-read', { messageId: id, by: user.username });
          }
        }
      }
    });
  });

  // ── Delete message ──
  socket.on('delete-message', ({ messageId, channel, dmPartner }) => {
    const user = users.get(socket.id);
    if (!user) return;

    if (channel === 'global') {
      const msg = globalMessages.find(m => m.id === messageId);
      if (msg && msg.username === user.username && !msg.isSystem) {
        msg.deleted = true;
        msg.text = '';
        msg.imageUrl = null;
        io.emit('message-deleted', { messageId, channel: 'global' });
      }
    } else if (channel === 'private' && dmPartner) {
      const key = dmKey(user.username, dmPartner);
      const arr = dmMessages.get(key) || [];
      const msg = arr.find(m => m.id === messageId);
      if (msg && msg.senderName === user.username) {
        msg.deleted = true;
        msg.text = '';
        msg.imageUrl = null;
        socket.emit('message-deleted', { messageId, channel: 'private' });
        const ps = usernameToSocket.get(dmPartner);
        if (ps) io.to(ps).emit('message-deleted', { messageId, channel: 'private' });
      }
    }
  });

  // ── Search ──
  socket.on('search-messages', ({ query }) => {
    const user = users.get(socket.id);
    if (!user || !query) return;
    const q = query.toLowerCase().trim();
    const results = [];

    // Search global
    globalMessages.forEach(m => {
      if (!m.deleted && !m.isSystem && m.text && m.text.toLowerCase().includes(q)) {
        results.push({ ...m, channel: 'global' });
      }
    });

    // Search DMs this user is part of
    for (const [key, msgs] of dmMessages) {
      if (key.includes(user.username)) {
        msgs.forEach(m => {
          if (!m.deleted && m.text && m.text.toLowerCase().includes(q)) {
            results.push(m);
          }
        });
      }
    }

    socket.emit('search-results', { query, results: results.slice(-50) });
  });

  // ── Typing ──
  socket.on('typing', ({ channel, to }) => {
    const user = users.get(socket.id);
    if (!user) return;
    if (channel === 'private' && to) {
      const ts = usernameToSocket.get(to);
      if (ts) io.to(ts).emit('typing', { username: user.username, channel: 'private' });
    } else {
      socket.broadcast.emit('typing', { username: user.username, channel: 'global' });
    }
  });

  socket.on('stop-typing', ({ channel, to }) => {
    const user = users.get(socket.id);
    if (!user) return;
    if (channel === 'private' && to) {
      const ts = usernameToSocket.get(to);
      if (ts) io.to(ts).emit('stop-typing', { username: user.username, channel: 'private' });
    } else {
      socket.broadcast.emit('stop-typing', { username: user.username, channel: 'global' });
    }
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      if (usernameToSocket.get(user.username) === socket.id) {
        usernameToSocket.delete(user.username);
      }
      lastSeenMap.set(user.username, new Date().toISOString());

      const sysMsg = {
        id: `sys-${uid()}`,
        text: `${user.username} left the chat`,
        timestamp: new Date().toISOString(),
        channel: 'global',
        isSystem: true
      };
      globalMessages.push(sysMsg);
      if (globalMessages.length > MAX_GLOBAL) globalMessages.shift();
      io.emit('system-message', sysMsg);

      io.emit('user-list', onlineList());
      io.emit('last-seen-data', lastSeenObj());

      console.log(`❌  ${user.username} left  (${users.size} online)`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀  ChatWave Ultimate running at http://localhost:${PORT}\n`);
});
