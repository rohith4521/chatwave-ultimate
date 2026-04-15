// ============================================================
//  ChatWave Ultimate — Client
//  Reactions, Replies, Image Sharing, Formatting, Read Receipts,
//  Sounds, Theme Toggle, Search, Toasts, Particles
// ============================================================

(() => {
  'use strict';

  // ── DOM ─────────────────────────────────────────────────
  const loginOverlay   = document.getElementById('login-overlay');
  const loginForm      = document.getElementById('login-form');
  const usernameInput  = document.getElementById('username-input');
  const particleCanvas = document.getElementById('particle-canvas');

  const chatApp        = document.getElementById('chat-app');
  const welcomeScreen  = document.getElementById('welcome-screen');
  const messagesEl     = document.getElementById('messages');
  const messageForm    = document.getElementById('message-form');
  const messageInput   = document.getElementById('message-input');

  const userListEl     = document.getElementById('user-list');
  const onlineCountEl  = document.getElementById('online-count');
  const headerOnline   = document.getElementById('header-online-count');
  const typingEl       = document.getElementById('typing-indicator');
  const chatTitle      = document.getElementById('chat-title');
  const channelGlobal  = document.getElementById('channel-global');
  const unreadGlobal   = document.getElementById('unread-global');

  const sidebar        = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const menuBtn        = document.getElementById('menu-btn');
  const sidebarClose   = document.getElementById('sidebar-close');

  const scrollBottomBtn = document.getElementById('scroll-bottom-btn');
  const newMsgCount     = document.getElementById('new-msg-count');

  const themeToggle    = document.getElementById('theme-toggle');
  const searchInput    = document.getElementById('search-input');
  const searchResults  = document.getElementById('search-results');

  const replyBar       = document.getElementById('reply-bar');
  const replyAuthor    = document.getElementById('reply-author');
  const replyText      = document.getElementById('reply-text');
  const replyCancel    = document.getElementById('reply-cancel');

  const imageInput     = document.getElementById('image-input');
  const imagePreviewBar= document.getElementById('image-preview-bar');
  const imagePreviewThumb = document.getElementById('image-preview-thumb');
  const imagePreviewName = document.getElementById('image-preview-name');
  const imagePreviewCancel = document.getElementById('image-preview-cancel');
  const dropZone       = document.getElementById('drop-zone');

  const emojiBtn       = document.getElementById('emoji-btn');
  const emojiPicker    = document.getElementById('emoji-picker');
  const emojiGrid      = document.getElementById('emoji-grid');
  const emojiTabs      = document.getElementById('emoji-tabs');

  const reactionPicker = document.getElementById('reaction-picker');

  const lightbox       = document.getElementById('lightbox');
  const lightboxImg    = document.getElementById('lightbox-img');
  const lightboxClose  = document.getElementById('lightbox-close');

  const toastContainer = document.getElementById('toast-container');

  const profileEl      = document.getElementById('user-profile');
  const profileAvatar  = document.getElementById('profile-avatar');
  const profileName    = document.getElementById('profile-name');

  // ── State ───────────────────────────────────────────────
  let socket = null, myId = '', myUsername = '';
  let activeChannel = 'global';

  const messageStore = { global: [] };
  const unreadCounts = {};
  let onlineUsers = [];
  let lastSeenData = {};

  let typingTimeout = null, isTyping = false;
  const typingUsers = {};

  let isUserScrolledUp = false, missedWhileScrolled = 0;

  let replyingTo = null;   // { id, author, text }
  let pendingImage = null; // { file, url }
  let activeReactionMsgId = null;

  const avatarColors = [
    '#6C63FF','#3B82F6','#8B5CF6','#EC4899',
    '#F59E0B','#10B981','#EF4444','#06B6D4',
    '#F97316','#84CC16','#A855F7','#14B8A6'
  ];

  // ── Emoji Data ──────────────────────────────────────────
  const emojiData = {
    smileys: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','😐','😑','😶','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱'],
    gestures: ['👍','👎','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤝','🙏','✍️','💪','🦾','🙌','👏','🤲','👐','🤜','🤛','✊','👊','🤟'],
    hearts: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','♥️','😍','🥰','😘','💋','💌'],
    animals: ['🐱','🐶','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🪳','🦟','🦗','🕷️','🐢','🐍','🦎','🦂','🦀','🦞'],
    food: ['🍕','🍔','🍟','🌭','🍿','🧆','🌮','🌯','🫔','🥙','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍩','🍪','🍦','🧋','☕','🍵','🥤','🍺','🍷','🥂','🍾','🧃','🥛','🍼','🫖','🍽️','🥢','🍴'],
    objects: ['⚡','🔥','💧','🌊','💥','💫','⭐','🌟','✨','💎','🔮','🎯','🎪','🎨','🎬','🎤','🎧','🎮','🎲','🧩','🎭','🎪','🏆','🥇','🥈','🥉','⚽','🏀','🏈','⚾','🎾','🏐','🎱','🏓','🏸','🥊','🛹','🎿','⛷️','🏂','🏊'],
    symbols: ['✨','💫','⭐','🌟','⚡','🔥','💥','❤️','💔','💕','💯','💢','💤','💨','🕊️','✅','❌','⭕','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔶','🔷','🔸','🔹','💠','♾️','🔄','✳️','❇️','🔆','🔅','‼️','⁉️','❓','❔','❕','❗','〰️','➿','♻️','🔱','📛','🔰','⚜️','📌']
  };

  // ── Helpers ─────────────────────────────────────────────
  function colorFor(n) {
    let h = 0;
    for (let i = 0; i < n.length; i++) h = n.charCodeAt(i) + ((h << 5) - h);
    return avatarColors[Math.abs(h) % avatarColors.length];
  }
  function initials(n) {
    return n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function formatTimeFull(iso) {
    return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  function timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ── Text Formatting ────────────────────────────────────
  function formatText(text) {
    let html = escapeHtml(text);
    // Code blocks ```...```
    html = html.replace(/```([\s\S]*?)```/g, '<span class="msg-code-block">$1</span>');
    // Inline code `...`
    html = html.replace(/`([^`]+)`/g, '<span class="msg-code">$1</span>');
    // Bold *...*
    html = html.replace(/\*([^*]+)\*/g, '<span class="msg-bold">$1</span>');
    // Italic _..._
    html = html.replace(/_([^_]+)_/g, '<span class="msg-italic">$1</span>');
    // URLs
    html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" class="msg-link">$1</a>');
    return html;
  }

  // ── Sound Effects (Web Audio API) ──────────────────────
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playSound(type) {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'send') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'receive') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'join') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'reaction') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) { /* audio not supported */ }
  }

  // ── Particle Canvas ───────────────────────────────────
  function initParticles() {
    const ctx = particleCanvas.getContext('2d');
    let w, h, particles = [];
    const count = 80;

    function resize() {
      w = particleCanvas.width = window.innerWidth;
      h = particleCanvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.r = Math.random() * 2 + 0.5;
        this.alpha = Math.random() * 0.4 + 0.1;
        this.color = Math.random() > 0.5 ? '108,99,255' : '59,130,246';
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > w) this.vx *= -1;
        if (this.y < 0 || this.y > h) this.vy *= -1;
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color},${this.alpha})`;
        ctx.fill();
      }
    }

    for (let i = 0; i < count; i++) particles.push(new Particle());

    function animate() {
      if (loginOverlay.classList.contains('hidden')) return;
      ctx.clearRect(0, 0, w, h);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(108,99,255,${0.06 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      particles.forEach(p => { p.update(); p.draw(); });
      requestAnimationFrame(animate);
    }
    animate();
  }
  initParticles();

  // ── Theme ──────────────────────────────────────────────
  const savedTheme = localStorage.getItem('chatwave-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('chatwave-theme', next);
  });

  // ── Scroll ────────────────────────────────────────────
  function isNearBottom() {
    return messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 120;
  }
  function scrollToBottom(force = false) {
    if (force || !isUserScrolledUp) {
      requestAnimationFrame(() => messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' }));
    }
  }
  function updateScrollButton() {
    const vis = !messagesEl.classList.contains('hidden');
    isUserScrolledUp = vis && !isNearBottom();
    if (isUserScrolledUp) {
      scrollBottomBtn.classList.remove('hidden');
    } else {
      scrollBottomBtn.classList.add('hidden');
      missedWhileScrolled = 0;
      newMsgCount.classList.add('hidden');
    }
  }
  messagesEl.addEventListener('scroll', updateScrollButton);
  scrollBottomBtn.addEventListener('click', () => {
    scrollToBottom(true);
    missedWhileScrolled = 0;
    newMsgCount.classList.add('hidden');
    scrollBottomBtn.classList.add('hidden');
  });

  // ── Sidebar ───────────────────────────────────────────
  menuBtn.addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
  });
  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
  }
  sidebarClose.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  // ── Emoji Picker ──────────────────────────────────────
  let currentEmojiCategory = 'smileys';
  let emojiTarget = 'input'; // 'input' or messageId

  function renderEmojiGrid(category) {
    emojiGrid.innerHTML = '';
    const emojis = emojiData[category] || [];
    emojis.forEach(e => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = e;
      btn.addEventListener('click', () => {
        if (emojiTarget === 'input') {
          messageInput.value += e;
          messageInput.focus();
        } else {
          // Add as reaction
          socket.emit('add-reaction', { messageId: emojiTarget, emoji: e });
          playSound('reaction');
          emojiPicker.classList.add('hidden');
          emojiBtn.classList.remove('active');
          emojiTarget = 'input';
        }
      });
      emojiGrid.appendChild(btn);
    });
  }
  renderEmojiGrid('smileys');

  emojiTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.emoji-tab');
    if (!btn) return;
    currentEmojiCategory = btn.dataset.category;
    emojiTabs.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderEmojiGrid(currentEmojiCategory);
  });

  emojiBtn.addEventListener('click', () => {
    emojiTarget = 'input';
    emojiPicker.classList.toggle('hidden');
    emojiBtn.classList.toggle('active');
    reactionPicker.classList.add('hidden');
  });

  // Close emoji picker when clicking outside
  document.addEventListener('click', (e) => {
    if (!emojiPicker.classList.contains('hidden') &&
        !emojiPicker.contains(e.target) &&
        !emojiBtn.contains(e.target)) {
      emojiPicker.classList.add('hidden');
      emojiBtn.classList.remove('active');
    }
    if (!reactionPicker.classList.contains('hidden') &&
        !reactionPicker.contains(e.target) &&
        !e.target.closest('.msg-action-btn')) {
      reactionPicker.classList.add('hidden');
      activeReactionMsgId = null;
    }
  });

  // ── Reaction Picker ───────────────────────────────────
  reactionPicker.querySelectorAll('.reaction-quick').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!activeReactionMsgId) return;
      socket.emit('add-reaction', { messageId: activeReactionMsgId, emoji: btn.dataset.emoji });
      playSound('reaction');
      reactionPicker.classList.add('hidden');
      activeReactionMsgId = null;
    });
  });

  document.getElementById('reaction-more-btn').addEventListener('click', () => {
    emojiTarget = activeReactionMsgId;
    emojiPicker.classList.remove('hidden');
    emojiBtn.classList.add('active');
    reactionPicker.classList.add('hidden');
  });

  function showReactionPicker(msgId, anchorEl) {
    activeReactionMsgId = msgId;
    const rect = anchorEl.getBoundingClientRect();
    reactionPicker.style.top = `${rect.top - 44}px`;
    reactionPicker.style.left = `${Math.min(rect.left, window.innerWidth - 320)}px`;
    reactionPicker.classList.remove('hidden');
  }

  // ── Reply ─────────────────────────────────────────────
  function setReply(id, author, text) {
    replyingTo = { id, author, text };
    replyAuthor.textContent = author;
    replyText.textContent = text || '📷 Image';
    replyBar.classList.remove('hidden');
    messageInput.focus();
  }
  replyCancel.addEventListener('click', () => {
    replyingTo = null;
    replyBar.classList.add('hidden');
  });

  // ── Image Upload ──────────────────────────────────────
  function setPendingImage(file) {
    if (!file) return;
    pendingImage = { file, url: URL.createObjectURL(file) };
    imagePreviewThumb.src = pendingImage.url;
    imagePreviewName.textContent = file.name;
    imagePreviewBar.classList.remove('hidden');
  }

  imageInput.addEventListener('change', () => {
    if (imageInput.files[0]) setPendingImage(imageInput.files[0]);
    imageInput.value = '';
  });

  imagePreviewCancel.addEventListener('click', () => {
    pendingImage = null;
    imagePreviewBar.classList.add('hidden');
  });

  // Drag & drop
  const chatMain = document.querySelector('.chat-main');
  let dragCounter = 0;
  chatMain.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dropZone.classList.remove('hidden');
  });
  chatMain.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) { dropZone.classList.add('hidden'); dragCounter = 0; }
  });
  chatMain.addEventListener('dragover', (e) => e.preventDefault());
  chatMain.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropZone.classList.add('hidden');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) setPendingImage(file);
  });

  // Paste image
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        setPendingImage(item.getAsFile());
        break;
      }
    }
  });

  async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/upload', { method: 'POST', body: formData });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Upload failed:', err);
      return null;
    }
  }

  // ── Lightbox ──────────────────────────────────────────
  function openLightbox(src) {
    lightboxImg.src = src;
    lightbox.classList.remove('hidden');
  }
  lightboxClose.addEventListener('click', () => lightbox.classList.add('hidden'));
  lightbox.querySelector('.lightbox-backdrop').addEventListener('click', () => lightbox.classList.add('hidden'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightbox.classList.contains('hidden')) {
      lightbox.classList.add('hidden');
    }
  });

  // ── Toast Notifications ───────────────────────────────
  function showToast(author, text, onClick) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast-avatar" style="background:${colorFor(author)}">${initials(author)}</div>
      <div class="toast-body">
        <div class="toast-title">${escapeHtml(author)}</div>
        <div class="toast-text">${escapeHtml(text || '📷 Image')}</div>
      </div>
    `;
    if (onClick) toast.addEventListener('click', () => { onClick(); toast.remove(); });
    toastContainer.appendChild(toast);
    playSound('receive');
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ── Search ────────────────────────────────────────────
  let searchTimeout = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = searchInput.value.trim();
    if (!q) { searchResults.classList.add('hidden'); return; }
    searchTimeout = setTimeout(() => {
      if (socket) socket.emit('search-messages', { query: q });
    }, 300);
  });

  // ── Login ─────────────────────────────────────────────
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = usernameInput.value.trim();
    if (!name) return;
    myUsername = name;
    socket = io();
    setupSocketListeners();
    socket.emit('user-join', myUsername);
    loginOverlay.classList.add('hidden');
    chatApp.classList.remove('hidden');
    messageInput.focus();

    // Set profile
    profileEl.classList.remove('hidden');
    profileAvatar.style.background = colorFor(myUsername);
    profileAvatar.textContent = initials(myUsername);
    profileName.textContent = myUsername;

    playSound('join');
  });

  // ── Socket Listeners ──────────────────────────────────
  function setupSocketListeners() {

    socket.on('connect', () => {
      if (myUsername) socket.emit('user-join', myUsername);
    });

    socket.on('join-success', ({ id, username }) => {
      myId = id;
      myUsername = username;
      activeChannel = 'global';
      channelGlobal.classList.add('active');
      chatTitle.textContent = 'Global Chat';
      welcomeScreen.classList.add('hidden');
      messagesEl.classList.remove('hidden');
    });

    // ── Global history ──
    socket.on('message-history', ({ channel, messages }) => {
      if (channel === 'global') {
        const ids = new Set(messages.map(m => m.id));
        const extra = (messageStore.global || []).filter(m => !ids.has(m.id));
        const all = [...extra, ...messages];
        all.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        messageStore.global = all;
        if (activeChannel === 'global') renderAllMessages('global');
      }
    });

    // ── DM history ──
    socket.on('dm-history', ({ withUser, messages }) => {
      const ids = new Set(messages.map(m => m.id));
      const extra = (messageStore[withUser] || []).filter(m => !ids.has(m.id));
      const all = [...extra, ...messages];
      all.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      messageStore[withUser] = all;
      if (activeChannel === withUser) renderAllMessages(withUser);
    });

    // ── Global message ──
    socket.on('chat-message', (msg) => {
      if (!messageStore.global) messageStore.global = [];
      if (messageStore.global.some(m => m.id === msg.id)) return;
      messageStore.global.push(msg);

      if (activeChannel === 'global') {
        renderSingleMessage(msg, msg.username === myUsername);
        if (isUserScrolledUp && msg.username !== myUsername) {
          missedWhileScrolled++;
          newMsgCount.textContent = missedWhileScrolled;
          newMsgCount.classList.remove('hidden');
        }
        if (msg.username !== myUsername) playSound('receive');
      } else {
        unreadCounts.global = (unreadCounts.global || 0) + 1;
        updateUnreadBadge('global');
      }
    });

    // ── Private message ──
    socket.on('private-message', (msg) => {
      const partner = msg.senderName === myUsername ? msg.recipientName : msg.senderName;
      if (!messageStore[partner]) messageStore[partner] = [];
      if (messageStore[partner].some(m => m.id === msg.id)) return;
      messageStore[partner].push(msg);

      if (activeChannel === partner) {
        const isSelf = msg.senderName === myUsername;
        renderSingleMessage(msg, isSelf, true);
        if (isUserScrolledUp && !isSelf) {
          missedWhileScrolled++;
          newMsgCount.textContent = missedWhileScrolled;
          newMsgCount.classList.remove('hidden');
        }
        if (!isSelf) {
          playSound('receive');
          // Mark as read
          socket.emit('messages-read', { messageIds: [msg.id], by: myUsername });
        }
      } else {
        unreadCounts[partner] = (unreadCounts[partner] || 0) + 1;
        renderUserList(onlineUsers);
        if (msg.senderName !== myUsername) {
          showToast(msg.senderName, msg.text, () => switchChannel(partner, partner));
        }
      }
    });

    // ── System message ──
    socket.on('system-message', (msg) => {
      if (!messageStore.global) messageStore.global = [];
      if (messageStore.global.some(m => m.id === msg.id)) return;
      messageStore.global.push(msg);
      if (activeChannel === 'global') appendSystemMessage(msg.text, msg.timestamp);
    });

    // ── Message deleted ──
    socket.on('message-deleted', ({ messageId }) => {
      for (const ch in messageStore) {
        const m = messageStore[ch].find(x => x.id === messageId);
        if (m) { m.deleted = true; m.text = ''; m.imageUrl = null; break; }
      }
      const el = document.querySelector(`[data-msg-id="${messageId}"]`);
      if (el) {
        el.classList.add('message-deleted');
        const bubble = el.querySelector('.message-bubble');
        if (bubble) { bubble.innerHTML = '🗑 This message was deleted'; bubble.removeAttribute('data-time'); }
        const btn = el.querySelector('.msg-delete-btn');
        if (btn) btn.remove();
        const actions = el.querySelector('.msg-actions');
        if (actions) actions.remove();
        const reactions = el.querySelector('.msg-reactions');
        if (reactions) reactions.remove();
      }
    });

    // ── Reactions ──
    socket.on('reaction-updated', ({ messageId, emoji, users, action, by }) => {
      // Update store
      for (const ch in messageStore) {
        const msg = messageStore[ch].find(m => m.id === messageId);
        if (msg) {
          if (!msg.reactions) msg.reactions = {};
          if (users.length > 0) msg.reactions[emoji] = users;
          else delete msg.reactions[emoji];
          break;
        }
      }
      // Update DOM
      const el = document.querySelector(`[data-msg-id="${messageId}"]`);
      if (el) updateReactionsUI(el, messageId);
      if (by !== myUsername && action === 'add') playSound('reaction');
    });

    // ── Read receipts ──
    socket.on('message-read', ({ messageId }) => {
      const el = document.querySelector(`[data-msg-id="${messageId}"] .msg-read-receipt`);
      if (el) { el.textContent = '✓✓'; el.classList.add('read'); }
    });

    // ── Search results ──
    socket.on('search-results', ({ query, results }) => {
      searchResults.innerHTML = '';
      if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-no-results">No results found</div>';
      } else {
        results.forEach(msg => {
          const item = document.createElement('div');
          item.className = 'search-result-item';
          const author = msg.username || msg.senderName || 'Unknown';
          const highlighted = escapeHtml(msg.text).replace(
            new RegExp(`(${escapeHtml(query)})`, 'gi'),
            '<mark>$1</mark>'
          );
          item.innerHTML = `
            <div class="sr-author">${escapeHtml(author)}${msg.channel === 'private' ? ' (DM)' : ''}</div>
            <div class="sr-text">${highlighted}</div>
            <div class="sr-time">${formatTimeFull(msg.timestamp)}</div>
          `;
          item.addEventListener('click', () => {
            const ch = msg.channel === 'global' ? 'global' : (msg.senderName === myUsername ? msg.recipientName : msg.senderName);
            switchChannel(ch, ch === 'global' ? 'Global Chat' : ch);
            searchInput.value = '';
            searchResults.classList.add('hidden');
            // Try to scroll to message
            setTimeout(() => {
              const target = document.querySelector(`[data-msg-id="${msg.id}"]`);
              if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                target.style.outline = '2px solid var(--accent)';
                target.style.borderRadius = '12px';
                setTimeout(() => { target.style.outline = ''; target.style.borderRadius = ''; }, 2000);
              }
            }, 300);
          });
          searchResults.appendChild(item);
        });
      }
      searchResults.classList.remove('hidden');
    });

    // ── User list ──
    socket.on('user-list', (users) => {
      onlineUsers = users;
      onlineCountEl.textContent = users.length;
      headerOnline.textContent = users.length;
      renderUserList(users);
      updateChatHeader();
    });

    // ── Last seen ──
    socket.on('last-seen-data', (data) => {
      lastSeenData = data;
      renderUserList(onlineUsers);
      updateChatHeader();
    });

    // ── Typing ──
    socket.on('typing', ({ username: who, channel }) => {
      const key = channel === 'private' ? who : 'global';
      if (!typingUsers[key]) typingUsers[key] = new Set();
      typingUsers[key].add(who);
      renderTyping();
    });
    socket.on('stop-typing', ({ username: who, channel }) => {
      const key = channel === 'private' ? who : 'global';
      if (typingUsers[key]) typingUsers[key].delete(who);
      renderTyping();
    });
  }

  // ── Render user list ──────────────────────────────────
  function renderUserList(users) {
    userListEl.innerHTML = '';

    users.forEach(({ username: name }) => {
      const isMe = name === myUsername;
      const li = document.createElement('li');
      li.className = isMe ? 'is-you' : '';
      if (activeChannel === name) li.classList.add('active');

      const unread = unreadCounts[name] || 0;
      const badge = !isMe && unread > 0
        ? `<span class="unread-badge">${unread}</span>`
        : (isMe ? '' : `<span class="dm-label">DM</span>`);

      li.innerHTML = `
        <div class="user-avatar" style="background:${colorFor(name)}">
          ${initials(name)}
          <span class="status-dot"></span>
        </div>
        <div class="user-info">
          <span class="user-name">${escapeHtml(name)}${isMe ? ' (you)' : ''}</span>
          <span class="user-last-seen online-text">Online</span>
        </div>
        ${badge}
      `;
      if (!isMe) li.addEventListener('click', () => switchChannel(name, name));
      userListEl.appendChild(li);
    });

    const onlineNames = new Set(users.map(u => u.username));
    Object.entries(lastSeenData).forEach(([name, time]) => {
      if (onlineNames.has(name) || name === myUsername) return;
      const li = document.createElement('li');
      li.className = 'offline-user';
      if (activeChannel === name) li.classList.add('active');

      const unread = unreadCounts[name] || 0;
      const badge = unread > 0
        ? `<span class="unread-badge">${unread}</span>`
        : `<span class="dm-label">DM</span>`;

      li.innerHTML = `
        <div class="user-avatar" style="background:${colorFor(name)}; opacity:0.5">
          ${initials(name)}
        </div>
        <div class="user-info">
          <span class="user-name" style="opacity:0.6">${escapeHtml(name)}</span>
          <span class="user-last-seen">Last seen ${timeAgo(time)}</span>
        </div>
        ${badge}
      `;
      li.addEventListener('click', () => switchChannel(name, name));
      userListEl.appendChild(li);
    });
  }

  // ── Chat header status ────────────────────────────────
  function updateChatHeader() {
    if (activeChannel === 'global') return;
    const name = activeChannel;
    const tSet = typingUsers[name];
    if (tSet && tSet.size > 0) return;

    const isOnline = onlineUsers.some(u => u.username === name);
    if (isOnline) {
      typingEl.innerHTML = `<span class="header-status online">● Online</span>`;
    } else if (lastSeenData[name]) {
      typingEl.innerHTML = `<span class="header-status offline">Last seen ${timeAgo(lastSeenData[name])}</span>`;
    } else {
      typingEl.innerHTML = '';
    }
  }

  // ── Switch channel ────────────────────────────────────
  function switchChannel(channel, label) {
    activeChannel = channel;
    if (channel === 'global') {
      channelGlobal.classList.add('active');
      chatTitle.textContent = 'Global Chat';
    } else {
      channelGlobal.classList.remove('active');
      chatTitle.textContent = label || 'Private Chat';
      socket.emit('request-dm-history', { withUser: channel });
    }

    unreadCounts[channel] = 0;
    if (channel === 'global') updateUnreadBadge('global');
    renderUserList(onlineUsers);

    welcomeScreen.classList.add('hidden');
    messagesEl.classList.remove('hidden');
    renderAllMessages(channel);

    missedWhileScrolled = 0;
    newMsgCount.classList.add('hidden');
    scrollBottomBtn.classList.add('hidden');
    isUserScrolledUp = false;

    // Clear reply & image
    replyingTo = null;
    replyBar.classList.add('hidden');
    pendingImage = null;
    imagePreviewBar.classList.add('hidden');

    updateChatHeader();
    renderTyping();

    messageInput.placeholder = channel === 'global' ? 'Type a message…' : `Message ${label}…`;
    messageInput.focus();
    closeSidebar();
  }

  channelGlobal.addEventListener('click', () => switchChannel('global', 'Global Chat'));

  // ── Find message by ID (for replies) ──────────────────
  function findMessage(id) {
    for (const ch in messageStore) {
      const msg = messageStore[ch].find(m => m.id === id);
      if (msg) return msg;
    }
    return null;
  }

  // ── Render all messages ───────────────────────────────
  function renderAllMessages(channel) {
    messagesEl.innerHTML = '';
    const msgs = messageStore[channel] || [];
    msgs.forEach(msg => {
      if (msg.isSystem) {
        appendSystemMessage(msg.text, msg.timestamp, false);
      } else {
        const isSelf = (msg.username === myUsername || msg.senderName === myUsername);
        renderSingleMessage(msg, isSelf, channel !== 'global', false);
      }
    });
    scrollToBottom(true);
  }

  // ── Last rendered ─────────────────────────────────────
  function getLastRendered() {
    const all = messagesEl.querySelectorAll('.message');
    if (!all.length) return { sender: null, time: null };
    const last = all[all.length - 1];
    return { sender: last.dataset.sender, time: last.dataset.time };
  }

  // ── Render single message ─────────────────────────────
  function renderSingleMessage(msg, isSelf, isDm = false, animate = true) {
    removeTypingBubble();
    const author = msg.username || msg.senderName || 'Unknown';
    const color = colorFor(author);

    const prev = getLastRendered();
    const grouped = prev.sender === author && prev.time &&
      (new Date(msg.timestamp) - new Date(prev.time)) < 120000;

    const div = document.createElement('div');
    div.className = `message ${isSelf ? 'self' : 'other'}${grouped ? ' grouped' : ''}${msg.deleted ? ' message-deleted' : ''}`;
    div.dataset.msgId = msg.id;
    div.dataset.sender = author;
    div.dataset.time = msg.timestamp;
    if (!animate) div.style.animation = 'none';

    const avatar = isSelf ? '' :
      `<div class="msg-avatar${grouped ? ' invisible' : ''}" style="background:${color}">${initials(author)}</div>`;

    // Reply block
    let replyHtml = '';
    if (msg.replyTo && !msg.deleted) {
      const replyMsg = findMessage(msg.replyTo);
      if (replyMsg) {
        const replyAuthorName = replyMsg.username || replyMsg.senderName || 'Unknown';
        replyHtml = `
          <div class="reply-block" data-reply-id="${msg.replyTo}">
            <div class="reply-block-author">${escapeHtml(replyAuthorName)}</div>
            <div class="reply-block-text">${replyMsg.imageUrl ? '📷 Image' : escapeHtml(replyMsg.text || '')}</div>
          </div>
        `;
      }
    }

    // Image
    let imageHtml = '';
    if (msg.imageUrl && !msg.deleted) {
      imageHtml = `<img class="msg-image" src="${msg.imageUrl}" alt="Shared image" loading="lazy" />`;
    }

    // Bubble text
    const bubbleText = msg.deleted ? '🗑 This message was deleted' : (msg.text ? formatText(msg.text) : '');
    const timeAttr = msg.deleted ? '' : ` data-time="${formatTimeFull(msg.timestamp)}"`;

    const deleteBtn = isSelf && !msg.deleted
      ? `<button class="msg-delete-btn" title="Delete">✕</button>` : '';

    // Action buttons (reply + react)
    const actionsHtml = !msg.deleted ? `
      <div class="msg-actions">
        <button class="msg-action-btn msg-reply-btn" title="Reply">↩</button>
        <button class="msg-action-btn msg-react-btn" title="React">😀</button>
      </div>
    ` : '';

    // Read receipt (DM, self only)
    let receiptHtml = '';
    if (isDm && isSelf && !msg.deleted) {
      const status = msg.read ? '✓✓' : (msg.delivered ? '✓✓' : '✓');
      const readClass = msg.read ? ' read' : '';
      receiptHtml = `<div class="msg-read-receipt${readClass}">${status}</div>`;
    }

    // Reactions
    let reactionsHtml = '';
    if (msg.reactions && Object.keys(msg.reactions).length > 0) {
      reactionsHtml = '<div class="msg-reactions">';
      for (const [emoji, users] of Object.entries(msg.reactions)) {
        const reacted = users.includes(myUsername) ? ' reacted' : '';
        reactionsHtml += `<button class="msg-reaction${reacted}" data-emoji="${emoji}" data-msg-id="${msg.id}">${emoji} <span class="reaction-count">${users.length}</span></button>`;
      }
      reactionsHtml += '</div>';
    }

    div.innerHTML = `
      ${avatar}
      <div class="msg-content">
        <div class="message-meta">
          <span class="msg-author">${escapeHtml(author)}</span>
          <span class="msg-time">${formatTime(msg.timestamp)}</span>
        </div>
        ${replyHtml}
        <div class="msg-bubble-wrap">
          <div class="message-bubble${isDm && !msg.deleted ? ' dm-bubble' : ''}"${timeAttr}>${bubbleText}${imageHtml}</div>
          ${deleteBtn}
          ${actionsHtml}
        </div>
        ${reactionsHtml}
        ${receiptHtml}
      </div>
    `;

    // Event: delete
    const delEl = div.querySelector('.msg-delete-btn');
    if (delEl) {
      delEl.addEventListener('click', () => {
        socket.emit('delete-message', {
          messageId: msg.id,
          channel: activeChannel === 'global' ? 'global' : 'private',
          dmPartner: activeChannel === 'global' ? null : activeChannel
        });
      });
    }

    // Event: reply
    const replyBtn = div.querySelector('.msg-reply-btn');
    if (replyBtn) {
      replyBtn.addEventListener('click', () => {
        setReply(msg.id, author, msg.text);
      });
    }

    // Event: react
    const reactBtn = div.querySelector('.msg-react-btn');
    if (reactBtn) {
      reactBtn.addEventListener('click', (e) => {
        showReactionPicker(msg.id, e.target);
      });
    }

    // Event: image lightbox
    const imgEl = div.querySelector('.msg-image');
    if (imgEl) {
      imgEl.addEventListener('click', () => openLightbox(msg.imageUrl));
    }

    // Event: reply block click (scroll to original)
    const replyBlock = div.querySelector('.reply-block');
    if (replyBlock) {
      replyBlock.addEventListener('click', () => {
        const target = document.querySelector(`[data-msg-id="${replyBlock.dataset.replyId}"]`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.style.outline = '2px solid var(--accent)';
          setTimeout(() => { target.style.outline = ''; }, 1500);
        }
      });
    }

    // Event: reaction badges click (toggle)
    div.querySelectorAll('.msg-reaction').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.dataset.emoji;
        const msgId = btn.dataset.msgId;
        if (btn.classList.contains('reacted')) {
          socket.emit('remove-reaction', { messageId: msgId, emoji });
        } else {
          socket.emit('add-reaction', { messageId: msgId, emoji });
          playSound('reaction');
        }
      });
    });

    messagesEl.appendChild(div);
    renderTypingBubble();
    scrollToBottom();
  }

  function updateReactionsUI(el, msgId) {
    let msg = null;
    for (const ch in messageStore) {
      msg = messageStore[ch].find(m => m.id === msgId);
      if (msg) break;
    }
    if (!msg) return;

    let container = el.querySelector('.msg-reactions');
    if (!msg.reactions || Object.keys(msg.reactions).length === 0) {
      if (container) container.remove();
      return;
    }

    if (!container) {
      container = document.createElement('div');
      container.className = 'msg-reactions';
      const content = el.querySelector('.msg-content');
      const receipt = el.querySelector('.msg-read-receipt');
      if (receipt) content.insertBefore(container, receipt);
      else content.appendChild(container);
    }

    container.innerHTML = '';
    for (const [emoji, users] of Object.entries(msg.reactions)) {
      const reacted = users.includes(myUsername) ? ' reacted' : '';
      const btn = document.createElement('button');
      btn.className = `msg-reaction${reacted}`;
      btn.dataset.emoji = emoji;
      btn.dataset.msgId = msgId;
      btn.innerHTML = `${emoji} <span class="reaction-count">${users.length}</span>`;
      btn.addEventListener('click', () => {
        if (btn.classList.contains('reacted')) {
          socket.emit('remove-reaction', { messageId: msgId, emoji });
        } else {
          socket.emit('add-reaction', { messageId: msgId, emoji });
          playSound('reaction');
        }
      });
      container.appendChild(btn);
    }
  }

  function appendSystemMessage(text, timestamp, animate = true) {
    removeTypingBubble();
    const div = document.createElement('div');
    div.className = 'system-message';
    if (!animate) div.style.animation = 'none';
    div.innerHTML = `<span>${escapeHtml(text)} · ${formatTime(timestamp)}</span>`;
    messagesEl.appendChild(div);
    renderTypingBubble();
    scrollToBottom();
  }

  // ── Unread badge ──────────────────────────────────────
  function updateUnreadBadge(ch) {
    if (ch === 'global') {
      const c = unreadCounts.global || 0;
      if (c > 0) { unreadGlobal.textContent = c; unreadGlobal.classList.remove('hidden'); }
      else unreadGlobal.classList.add('hidden');
    }
  }

  // ── Typing ────────────────────────────────────────────
  function renderTyping() {
    const key = activeChannel === 'global' ? 'global' : activeChannel;
    const set = typingUsers[key];
    if (!set || set.size === 0) {
      updateChatHeader();
      removeTypingBubble();
      return;
    }
    const names = Array.from(set);
    let text = names.length === 1 ? `${names[0]} is typing`
      : names.length === 2 ? `${names[0]} and ${names[1]} are typing`
      : `${names.length} people are typing`;
    typingEl.innerHTML = `${escapeHtml(text)}<span class="typing-dots"><span></span><span></span><span></span></span>`;
    renderTypingBubble();
  }

  function renderTypingBubble() {
    removeTypingBubble();
    const key = activeChannel === 'global' ? 'global' : activeChannel;
    const set = typingUsers[key];
    if (!set || set.size === 0) return;
    const name = Array.from(set)[0];
    const row = document.createElement('div');
    row.className = 'typing-bubble-row';
    row.id = 'typing-bubble-el';
    row.innerHTML = `
      <div class="typing-bubble-avatar" style="background:${colorFor(name)}">${initials(name)}</div>
      <div class="typing-bubble"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
    `;
    messagesEl.appendChild(row);
    scrollToBottom();
  }

  function removeTypingBubble() {
    const el = document.getElementById('typing-bubble-el');
    if (el) el.remove();
  }

  // ── Send message ──────────────────────────────────────
  messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();

    if (!text && !pendingImage) {
      if (socket) {
        messageInput.classList.add('shake');
        messageInput.addEventListener('animationend', () => messageInput.classList.remove('shake'), { once: true });
      }
      return;
    }

    if (!socket) return;
    if (!welcomeScreen.classList.contains('hidden')) {
      welcomeScreen.classList.add('hidden');
      messagesEl.classList.remove('hidden');
    }

    let imageUrl = null, imageName = null;
    if (pendingImage) {
      const result = await uploadImage(pendingImage.file);
      if (result) {
        imageUrl = result.url;
        imageName = result.name;
      }
      pendingImage = null;
      imagePreviewBar.classList.add('hidden');
    }

    const payload = {
      text,
      replyTo: replyingTo ? replyingTo.id : null,
      imageUrl,
      imageName
    };

    if (activeChannel === 'global') {
      socket.emit('chat-message', payload);
    } else {
      socket.emit('private-message', { to: activeChannel, ...payload });
    }

    playSound('send');
    messageInput.value = '';
    messageInput.focus();

    // Clear reply
    replyingTo = null;
    replyBar.classList.add('hidden');

    if (isTyping) {
      isTyping = false;
      socket.emit('stop-typing', {
        channel: activeChannel === 'global' ? 'global' : 'private',
        to: activeChannel === 'global' ? null : activeChannel
      });
    }
  });

  // ── Typing emission ───────────────────────────────────
  messageInput.addEventListener('input', () => {
    if (!socket) return;
    const ch = activeChannel === 'global' ? 'global' : 'private';
    const to = activeChannel === 'global' ? null : activeChannel;
    if (!isTyping) { isTyping = true; socket.emit('typing', { channel: ch, to }); }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { isTyping = false; socket.emit('stop-typing', { channel: ch, to }); }, 1500);
  });

  // ── Refresh last-seen every minute ────────────────────
  setInterval(() => { renderUserList(onlineUsers); updateChatHeader(); }, 60000);

})();
