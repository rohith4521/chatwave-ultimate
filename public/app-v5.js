(() => {
  'use strict';

  // ── DOM ─────────────────────────────────────────────────
  const loginOverlay   = document.getElementById('login-overlay');
  const loginForm      = document.getElementById('login-form');
  const usernameInput  = document.getElementById('username-input');
  const passwordInput  = document.getElementById('password-input');
  const tabLogin       = document.getElementById('tab-login');
  const tabRegister    = document.getElementById('tab-register');
  const joinBtnText    = document.getElementById('join-btn-text');
  
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

  const voiceBtn       = document.getElementById('voice-btn');
  const recOverlay     = document.getElementById('recording-overlay');
  const recTimer       = document.getElementById('recording-timer');
  const recCancel      = document.getElementById('record-cancel');
  const recSend        = document.getElementById('record-send');

  const emojiBtn       = document.getElementById('emoji-btn');
  const emojiPicker    = document.getElementById('emoji-picker');
  const emojiGrid      = document.getElementById('emoji-grid');
  const emojiTabs      = document.getElementById('emoji-tabs');
  const reactionPicker = document.getElementById('reaction-picker');

  const lightbox       = document.getElementById('lightbox');
  const lightboxImg    = document.getElementById('lightbox-img');
  const lightboxClose  = document.getElementById('lightbox-close');
  const toastContainer = document.getElementById('toast-container');

  const profileAvatar  = document.getElementById('profile-avatar');
  const profileName    = document.getElementById('profile-name');

  // WebRTC DOM
  const callBtn          = document.getElementById('call-btn');
  const incCallModal     = document.getElementById('incoming-call-modal');
  const incCallerName    = document.getElementById('caller-name');
  const incCallAccept    = document.getElementById('call-accept');
  const incCallReject    = document.getElementById('call-reject');
  
  const activeCallModal  = document.getElementById('active-call-modal');
  const remoteVideo      = document.getElementById('remote-video');
  const localVideo       = document.getElementById('local-video');
  const callHangup       = document.getElementById('call-hangup');

  // ── State ───────────────────────────────────────────────
  let socket = null;
  let myId = '', myUsername = '', myColor = '';
  let activeChannel = 'global';
  let authMode = 'login'; // 'login' or 'register'
  let myToken = localStorage.getItem('chatwave_token') || null;

  const messageStore = { global: [] };
  const unreadCounts = {};
  let onlineUsers = [];
  let typingTimeout = null, isTyping = false;
  let isUserScrolledUp = false, missedWhileScrolled = 0;

  let replyingTo = null;   
  let editingMsgId = null;
  let pendingImage = null; 
  let activeReactionMsgId = null;

  // Audio State
  let mediaRecorder = null;
  let audioChunks = [];
  let recStartTime = 0;
  let recInterval = null;

  // WebRTC State
  let rtcPeerConnection = null;
  let localStream = null;
  let activeCallUser = null;
  let isCallIncoming = false;

  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const emojiData = {
    smileys: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','🥰','😍','🤩','😘','😜','🤪','😎','🤓','😎','🥺','😢','😭','😡','🤯'],
    gestures: ['👍','👎','👌','✌️','🤞','🤙','👋','🙏','💪','👏','🙌'],
    hearts: ['❤️','🧡','💛','💚','💙','💜','🖤','💔','💕','💖'],
    animals: ['🐱','🐶','🐭','🦊','🐻','🐼','🦁','🐮','🐷','🐸'],
    food: ['🍕','🍔','🍟','🌭','🥐','🥞','🧇','🧀','🥩','🍗','🍏','🍎','🍇','🍉'],
    objects: ['📱','💻','⌚','⌨️','🖱️','🖨️','📷','🎥','📺','📻','🧭','⏳','💡','🚀'],
    symbols: ['✨','🔥','🎉','💯','✅','❌','⚠️','☢️','☯️','☮️','✝️','☪️']
  };

  // ── Initial Setup ───────────────────────────────────────
  initTheme();
  initEmojiPicker();
  setupAuthTabs();

  // If token exists, we could auto-login, but for now we require explicit click to test auth
  if (myToken) {
    // Optionally auto-connect
  }

  // ── Auth Handling ────────────────────────────────────────
  function setupAuthTabs() {
    tabLogin.addEventListener('click', () => { authMode='login'; tabLogin.classList.add('active'); tabRegister.classList.remove('active'); joinBtnText.innerText = 'Sign In'; });
    tabRegister.addEventListener('click', () => { authMode='register'; tabRegister.classList.add('active'); tabLogin.classList.remove('active'); joinBtnText.innerText = 'Create Account'; });
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const uname = usernameInput.value.trim();
    const pass = passwordInput.value;
    if (!uname || !pass) return;

    try {
      const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname, password: pass })
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error);
        return;
      }
      
      myToken = data.token;
      localStorage.setItem('chatwave_token', myToken);
      
      // Connect Socket
      socket = io({ auth: { token: myToken } });
      setupSocketListeners();
      
    } catch(err) {
      alert("Error connecting to server.");
    }
  });

  // ── Socket Listeners ──────────────────────────────────
  function setupSocketListeners() {
    socket.on('connect_error', err => {
      alert("Connection failed: " + err.message);
      myToken = null;
      localStorage.removeItem('chatwave_token');
      window.location.reload();
    });

    socket.on('join-success', ({ id, username, color }) => {
      myId = id; myUsername = username; myColor = color;
      
      profileName.textContent = myUsername;
      profileAvatar.textContent = myUsername.charAt(0).toUpperCase();
      profileAvatar.style.background = myColor || avatarColors[0];
      
      loginOverlay.style.display = 'none';
      chatApp.classList.remove('hidden');
      
      socket.emit('request-history', { channel: 'global', limit: 50 });
      switchChannel('global');
    });

    socket.on('user-list', (users) => {
      onlineUsers = users;
      onlineCountEl.textContent = onlineUsers.length;
      headerOnline.textContent = onlineUsers.length;
      renderUserList();
    });

    socket.on('system-message', (data) => {
      if (activeChannel !== 'global') return;
      if (!messageStore['global']) messageStore['global'] = [];
      messageStore['global'].push({ ...data, type: 'system' });
      renderSingleMessage({ ...data, type: 'system' });
    });

    socket.on('message-history', ({ channel, messages }) => {
      messageStore[channel] = messages.map(m => ({ ...m, type: 'chat' }));
      if (activeChannel === channel) renderMessages();
      markAsRead(channel);
    });

    socket.on('chat-message', (data) => {
      if (!messageStore['global']) messageStore['global'] = [];
      messageStore['global'].push({ ...data, type: 'chat' });
      if (activeChannel === 'global') {
        renderSingleMessage({ ...data, type: 'chat' });
      } else {
        incrementUnread('global');
      }
    });

    socket.on('private-message', (data) => {
      const isMine = data.senderName === myUsername;
      const ch = isMine ? data.recipientName : data.senderName;
      
      if (!messageStore[ch]) messageStore[ch] = [];
      messageStore[ch].push({ ...data, type: 'chat' });

      if (activeChannel === ch) {
        renderSingleMessage({ ...data, type: 'chat' });
        if (!isMine) socket.emit('messages-read', { messageIds: [data.id], by: myUsername });
      } else {
        if (!isMine) {
          incrementUnread(ch);
          showToast(data.senderName, data.text || (data.imageUrl ? "Sent an image" : "Sent an attachment"));
          playSound('notification');
        }
      }
    });

    socket.on('message-edited', ({ messageId, newText }) => {
      for (const ch in messageStore) {
        const mm = messageStore[ch].find(m => m.id === messageId);
        if (mm) { mm.text = newText; mm.edited = true; }
      }
      if (activeChannel) renderMessages(); // full re-render for simplicity
    });

    socket.on('message-deleted', ({ messageId }) => {
      for (const ch in messageStore) {
        const mm = messageStore[ch].find(m => m.id === messageId);
        if (mm) { mm.deleted = true; mm.text = null; mm.imageUrl = null; mm.voiceUrl = null; }
      }
      if (activeChannel) renderMessages();
    });

    socket.on('reaction-updated', ({ messageId, allReactions }) => {
      for (const ch in messageStore) {
        const mm = messageStore[ch].find(m => m.id === messageId);
        if (mm) { mm.reactions = allReactions; }
      }
      const rb = document.getElementById(`reacts-${messageId}`);
      if (rb) {
        const html = renderReactionsHTML(allReactions, messageId);
        rb.innerHTML = html;
        bindReactionClickEvents(messageId);
      }
    });

    socket.on('message-read', ({ messageId }) => {
      for (const ch in messageStore) {
        const mm = messageStore[ch].find(m => m.id === messageId);
        if (mm) mm.read = true;
      }
      const rEl = document.getElementById(`read-${messageId}`);
      if (rEl) {
        rEl.innerHTML = `✓✓`;
        rEl.classList.add('read');
      }
    });

    socket.on('typing', ({ username, channel }) => {
      const ch = channel === 'global' ? 'global' : username;
      if (!typingUsers[ch]) typingUsers[ch] = new Set();
      typingUsers[ch].add(username);
      if (activeChannel === ch) updateTypingIndicator();
    });

    socket.on('stop-typing', ({ username, channel }) => {
      const ch = channel === 'global' ? 'global' : username;
      if (typingUsers[ch]) typingUsers[ch].delete(username);
      if (activeChannel === ch) updateTypingIndicator();
    });

    // WEBRTC SIGNALING
    socket.on('webrtc-offer', async (data) => {
      isCallIncoming = true;
      activeCallUser = data.sender;
      incCallerName.innerText = data.sender;
      incCallModal.classList.remove('hidden');
      playSound('focus');
      
      // Save offer temporarily
      window.incomingOffer = data.offer;
    });

    socket.on('webrtc-answer', async (data) => {
      if (rtcPeerConnection) {
        await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    socket.on('webrtc-candidate', async (data) => {
      if (rtcPeerConnection && data.candidate) {
        await rtcPeerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    socket.on('webrtc-call-action', (data) => {
      if (data.action === 'reject') {
        endCall();
        alert(`${data.sender} declined the call.`);
      } else if (data.action === 'hangup') {
        endCall();
      }
    });

    socket.on('search-results', ({ query, results }) => {
      renderSearchResults(results, query);
    });
  }

  // ── WebRTC Calling ────────────────────────────────────
  callBtn.addEventListener('click', async () => {
    if (activeChannel === 'global') return;
    activeCallUser = activeChannel;
    await startCall(true);
  });

  incCallAccept.addEventListener('click', async () => {
    incCallModal.classList.add('hidden');
    isCallIncoming = false;
    await startCall(false, window.incomingOffer);
    window.incomingOffer = null;
  });

  incCallReject.addEventListener('click', () => {
    incCallModal.classList.add('hidden');
    isCallIncoming = false;
    if (activeCallUser) {
      socket.emit('webrtc-call-action', { target: activeCallUser, action: 'reject' });
    }
  });

  callHangup.addEventListener('click', () => {
    if (activeCallUser) {
      socket.emit('webrtc-call-action', { target: activeCallUser, action: 'hangup' });
    }
    endCall();
  });

  async function startCall(isInitiator, offer = null) {
    activeCallModal.classList.remove('hidden');
    
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideo.srcObject = localStream;
    } catch(err) {
      alert("Camera/Mic access denied!");
      endCall();
      return;
    }

    rtcPeerConnection = new RTCPeerConnection(iceServers);
    
    localStream.getTracks().forEach(track => {
      rtcPeerConnection.addTrack(track, localStream);
    });

    rtcPeerConnection.ontrack = (event) => {
      remoteVideo.srcObject = event.streams[0];
    };

    rtcPeerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-candidate', { target: activeCallUser, candidate: event.candidate });
      }
    };

    if (isInitiator) {
      const offer = await rtcPeerConnection.createOffer();
      await rtcPeerConnection.setLocalDescription(offer);
      socket.emit('webrtc-offer', { target: activeCallUser, offer });
    } else {
      await rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await rtcPeerConnection.createAnswer();
      await rtcPeerConnection.setLocalDescription(answer);
      socket.emit('webrtc-answer', { target: activeCallUser, answer });
    }
  }

  function endCall() {
    activeCallModal.classList.add('hidden');
    incCallModal.classList.add('hidden');
    isCallIncoming = false;
    activeCallUser = null;
    
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    if (rtcPeerConnection) {
      rtcPeerConnection.close();
      rtcPeerConnection = null;
    }
    remoteVideo.srcObject = null;
    localVideo.srcObject = null;
  }

  // ── Audio Recording ───────────────────────────────────
  voiceBtn.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = uploadVoiceNote;
      
      recOverlay.classList.remove('hidden');
      recStartTime = Date.now();
      recTimer.innerText = "0:00";
      recInterval = setInterval(() => {
        const sec = Math.floor((Date.now() - recStartTime)/1000);
        const m = Math.floor(sec/60);
        const s = (sec%60).toString().padStart(2,'0');
        recTimer.innerText = `${m}:${s}`;
      }, 1000);
      
      mediaRecorder.start();
    } catch(err) {
      alert("Mic permission needed for Voice Notes.");
    }
  });

  recCancel.addEventListener('click', () => {
    if(mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.onstop = null; // discard
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t=>t.stop());
    }
    clearInterval(recInterval);
    recOverlay.classList.add('hidden');
  });

  recSend.addEventListener('click', () => {
    if(mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t=>t.stop());
    }
    clearInterval(recInterval);
    recOverlay.classList.add('hidden');
  });

  async function uploadVoiceNote() {
    if (audioChunks.length === 0) return;
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', blob, 'voicenote.webm');
    
    try {
      const res = await fetch('/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) sendMessageData({ voiceUrl: data.url });
    } catch(err) { alert("Voice note upload failed"); }
  }

  // ── General Message Send ──────────────────────────────
  messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text && !pendingImage) return;

    if (editingMsgId) {
      // It's an edit
      socket.emit('edit-message', { id: editingMsgId, newText: text });
      cancelEdit();
      return;
    }

    if (pendingImage) {
      const formData = new FormData();
      formData.append('file', pendingImage.file);
      try {
        const res = await fetch('/upload', { method: 'POST', body: formData });
        const data = await res.json();
        sendMessageData({ text, imageUrl: data.url });
      } catch (err) { alert("Upload failed"); }
      cancelImagePreview();
    } else {
      sendMessageData({ text });
    }
  });

  function sendMessageData(payload) {
    if (replyingTo) payload.replyTo = replyingTo.id;
    if (activeChannel === 'global') socket.emit('chat-message', payload);
    else socket.emit('private-message', { ...payload, to: activeChannel });
    
    messageInput.value = '';
    messageInput.focus();
    cancelReply();
    clearTyping();
  }

  function editMessage(id, oldText) {
    editingMsgId = id;
    messageInput.value = oldText;
    messageInput.focus();
    // we could add an edit bar similar to reply bar, but simply populating input is sleek
  }
  function cancelEdit() {
    editingMsgId = null;
    messageInput.value = '';
  }

  // ── Render ──────────────────────────────────────────────
  function switchChannel(channel) {
    activeChannel = channel;
    
    document.querySelectorAll('.channel-item, .user-list li').forEach(el => el.classList.remove('active'));
    if (channel === 'global') {
      channelGlobal.classList.add('active');
      chatTitle.textContent = 'Global Chat';
      welcomeScreen.style.display = messageStore['global'].length ? 'none' : 'flex';
      callBtn.classList.add('hidden');
    } else {
      const uEl = document.querySelector(`.user-list li[data-username="${channel}"]`);
      if (uEl) uEl.classList.add('active');
      chatTitle.textContent = `@${channel}`;
      welcomeScreen.style.display = 'none';
      callBtn.classList.remove('hidden');
      
      if (!messageStore[channel]) {
        messageStore[channel] = [];
        socket.emit('request-history', { channel });
      }
    }
    
    unreadCounts[channel] = 0;
    updateUnreadBadges();
    
    if (window.innerWidth <= 768) sidebar.classList.remove('open');
    renderMessages();
    markAsRead(channel);
    messageInput.focus();
  }

  function renderMessages() {
    messagesEl.innerHTML = '';
    const msgs = messageStore[activeChannel] || [];
    msgs.forEach(renderSingleMessage);
    scrollToBottom();
  }

  function renderSingleMessage(msg) {
    if (!msg) return;
    welcomeScreen.style.display = 'none';
    messagesEl.classList.remove('hidden');

    if (msg.type === 'system') {
      const d = document.createElement('div'); d.className = 'system-message';
      d.innerHTML = `<span>${msg.text}</span>`;
      messagesEl.appendChild(d);
      return;
    }

    const isSelf = msg.senderName === myUsername;
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

    const wrapper = document.createElement('div');
    wrapper.className = `message ${isSelf ? 'self' : 'other'} ${msg.grouped ? 'grouped' : ''}`;
    wrapper.id = `msg-${msg.id}`;

    let refHtml = '';
    if (msg.replyTo) {
      const refMsg = (messageStore[activeChannel]||[]).find(m => m.id === msg.replyTo);
      if (refMsg) {
        refHtml = `
          <div class="reply-block" onclick="document.getElementById('msg-${refMsg.id}')?.scrollIntoView({behavior:'smooth', block:'center'})">
            <div class="reply-block-author">${refMsg.senderName}</div>
            <div class="reply-block-text">${sanitize(refMsg.text || 'Attachment')}</div>
          </div>`;
      }
    }

    let mediaHtml = '';
    if (msg.voiceUrl) {
      mediaHtml = `<audio src="${msg.voiceUrl}" controls class="msg-audio"></audio>`;
    } else if (msg.imageUrl) {
      mediaHtml = `<img src="${msg.imageUrl}" class="msg-image" onclick="openLightbox('${msg.imageUrl}')" loading="lazy" />`;
    }

    let textHtml = msg.text ? parseFormatting(sanitize(msg.text)) : '';
    let editedTag = msg.edited ? `<span style="font-size:0.6rem; opacity:0.6; margin-left:4px;">(edited)</span>` : '';
    
    if (msg.deleted) {
      textHtml = `<span style="font-style:italic; opacity:0.6;">🚫 Message deleted</span>`;
      mediaHtml = ''; editedTag = ''; refHtml = '';
    }

    const reactHtml = renderReactionsHTML(msg.reactions, msg.id);
    const readTag = (isSelf && activeChannel !== 'global' && !msg.deleted) 
      ? `<div class="msg-read-receipt ${msg.read?'read':''}" id="read-${msg.id}">${msg.read ? '✓✓' : '✓'}</div>` : '';

    const actBtns = !msg.deleted ? `
      <div class="msg-actions">
        ${isSelf ? `<button class="msg-action-btn edit" data-id="${msg.id}">✏️</button>` : ''}
        ${isSelf ? `<button class="msg-action-btn delete" data-id="${msg.id}">🗑</button>` : ''}
        <button class="msg-action-btn reply" data-id="${msg.id}" data-author="${msg.senderName}">↩️</button>
        <button class="msg-action-btn react" data-id="${msg.id}">😀</button>
      </div>` : '';

    const avatarHtml = `<div class="msg-avatar ${msg.grouped ? 'invisible' : ''}" style="background: ${getAvatarColor(msg.senderName)}">${msg.senderName.charAt(0).toUpperCase()}</div>`;

    wrapper.innerHTML = `
      ${!isSelf ? avatarHtml : ''}
      <div class="msg-content">
        <div class="message-meta">
          <span class="msg-author">${msg.senderName}</span>
          <span class="msg-time">${time}</span>
        </div>
        <div class="msg-bubble-wrap">
          ${actBtns}
          <div class="message-bubble" data-time="${time}">
            ${refHtml}
            ${mediaHtml}
            <div>${textHtml}${editedTag}</div>
          </div>
        </div>
        <div class="msg-reactions" id="reacts-${msg.id}">${reactHtml}</div>
        ${readTag}
      </div>
    `;

    messagesEl.appendChild(wrapper);

    // Bind action events
    const replyBtn = wrapper.querySelector('.reply');
    if (replyBtn) replyBtn.onclick = () => initReply(msg);
    
    const reactBtn = wrapper.querySelector('.react');
    if (reactBtn) reactBtn.onclick = (e) => showReactionPicker(e, msg.id, wrapper);

    const editBtn = wrapper.querySelector('.edit');
    if (editBtn) editBtn.onclick = () => editMessage(msg.id, msg.text);

    const delBtn = wrapper.querySelector('.delete');
    if (delBtn) delBtn.onclick = () => { if(confirm("Delete message?")) socket.emit('delete-message', { messageId: msg.id }); };

    bindReactionClickEvents(msg.id);

    if (!isUserScrolledUp) scrollToBottom();
    else if (!isSelf) showNewMsgBadge();
  }

  function renderReactionsHTML(reactionsObj, msgId) {
    if (!reactionsObj) return '';
    let html = '';
    for (const [emoji, users] of Object.entries(reactionsObj)) {
      if (users.length > 0) {
        const reacted = users.includes(myUsername) ? 'reacted' : '';
        html += `<div class="msg-reaction ${reacted}" data-msgid="${msgId}" data-emoji="${emoji}" title="${users.join(', ')}">
          ${emoji} <span class="reaction-count">${users.length}</span>
        </div>`;
      }
    }
    return html;
  }

  function bindReactionClickEvents(msgId) {
    const wrap = document.getElementById(`reacts-${msgId}`);
    if (!wrap) return;
    const btns = wrap.querySelectorAll('.msg-reaction');
    btns.forEach(b => {
      b.onclick = () => {
        const emoji = b.getAttribute('data-emoji');
        const isReacted = b.classList.contains('reacted');
        if (isReacted) socket.emit('remove-reaction', { messageId: msgId, emoji });
        else socket.emit('add-reaction', { messageId: msgId, emoji });
      };
    });
  }

  function renderUserList() {
    userListEl.innerHTML = '';
    const sorted = [...onlineUsers].sort((a,b) => a.username.localeCompare(b.username));
    
    sorted.forEach(u => {
      const li = document.createElement('li');
      li.className = (u.username === activeChannel) ? 'active' : '';
      if (u.username === myUsername) li.classList.add('is-you');
      li.dataset.username = u.username;
      
      const unreadCount = unreadCounts[u.username] || 0;
      const unreadBadge = unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : '';

      li.innerHTML = `
        <div class="user-avatar" style="background:${getAvatarColor(u.username)}">${u.username.charAt(0).toUpperCase()}
          <div class="status-dot"></div>
        </div>
        <div class="user-info">
          <span class="user-name">${u.username} ${u.username === myUsername ? '(you)' : ''}</span>
          <span class="user-last-seen online-text">Online</span>
        </div>
        <span class="dm-label">DM</span>
        ${unreadBadge}
      `;
      if (u.username !== myUsername) li.onclick = () => switchChannel(u.username);
      userListEl.appendChild(li);
    });
  }

  function getAvatarColor(username) {
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  }

  function getUnreadMessagesInChannel(ch) {
    if (!messageStore[ch]) return [];
    return messageStore[ch].filter(m => !m.read && m.senderName !== myUsername);
  }

  function markAsRead(channel) {
    if (channel === 'global') return;
    const unread = getUnreadMessagesInChannel(channel);
    if (unread.length > 0) {
      socket.emit('messages-read', { messageIds: unread.map(m=>m.id), by: myUsername });
      unread.forEach(m => m.read = true);
    }
  }

  function incrementUnread(channel) {
    unreadCounts[channel] = (unreadCounts[channel] || 0) + 1;
    updateUnreadBadges();
  }

  function updateUnreadBadges() {
    const gl = unreadCounts['global'] || 0;
    if (gl > 0) {
      unreadGlobal.textContent = gl; unreadGlobal.classList.remove('hidden');
    } else { unreadGlobal.classList.add('hidden'); }
    
    document.querySelectorAll('.user-list .unread-badge').forEach(el => el.remove());
    for (const [ch, count] of Object.entries(unreadCounts)) {
      if (ch !== 'global' && count > 0) {
        const uEl = document.querySelector(`.user-list li[data-username="${ch}"]`);
        if (uEl) {
          const b = document.createElement('span'); b.className = 'unread-badge'; b.textContent = count;
          uEl.appendChild(b);
        }
      }
    }
  }

  // ── Utils / Misc UI ───────────────────────────────────────
  
  function initReply(msg) {
    replyingTo = { id: msg.id, author: msg.senderName, text: msg.text || 'Attachment/Voice' };
    replyAuthor.textContent = msg.senderName;
    replyText.textContent = msg.text || 'Attachment';
    replyBar.classList.remove('hidden');
    messageInput.focus();
  }

  function cancelReply() { replyingTo = null; replyBar.classList.add('hidden'); }
  replyCancel.onclick = cancelReply;

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
    isUserScrolledUp = false;
    missedWhileScrolled = 0;
    scrollBottomBtn.classList.add('hidden');
  }

  messagesEl.addEventListener('scroll', () => {
    isUserScrolledUp = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight > 50;
    if (!isUserScrolledUp) { scrollBottomBtn.classList.add('hidden'); missedWhileScrolled = 0; }
  });

  scrollBottomBtn.onclick = scrollToBottom;

  function showNewMsgBadge() {
    missedWhileScrolled++;
    newMsgCount.textContent = missedWhileScrolled;
    newMsgCount.classList.remove('hidden');
    scrollBottomBtn.classList.remove('hidden');
  }

  // File Upload
  imageInput.addEventListener('change', e => { if(e.target.files[0]) handleImageSelect(e.target.files[0]); });
  
  function handleImageSelect(file) {
    if (!file.type.startsWith('image/')) return;
    pendingImage = { file, url: URL.createObjectURL(file) };
    imagePreviewThumb.src = pendingImage.url;
    imagePreviewName.textContent = file.name;
    imagePreviewBar.classList.remove('hidden');
    messageInput.focus();
  }

  function cancelImagePreview() {
    pendingImage = null; imageInput.value = '';
    imagePreviewBar.classList.add('hidden');
  }
  imagePreviewCancel.onclick = cancelImagePreview;

  // Search
  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    if (q.length > 2) socket.emit('search-messages', {query: q});
    else searchResults.classList.add('hidden');
  });

  function renderSearchResults(results, query) {
    if (results.length === 0) {
      searchResults.innerHTML = `<div class="search-no-results">No results for "${query}"</div>`;
    } else {
      searchResults.innerHTML = '';
      results.forEach(r => {
        const d = document.createElement('div'); d.className = 'search-result-item';
        d.innerHTML = `<div class="sr-author">${r.senderName} (${r.channel})</div><div class="sr-text">${r.text}</div>`;
        d.onclick = () => { switchChannel(r.senderName === myUsername ? r.recipientName : (r.channel==='global'?'global':r.senderName)); searchResults.classList.add('hidden'); searchInput.value=''; }
        searchResults.appendChild(d);
      });
    }
    searchResults.classList.remove('hidden');
  }

  // Formatting parser
  function parseFormatting(t) {
    return t.replace(/\*\*(.*?)\*\*/g, '<span class="msg-bold">$1</span>')
            .replace(/\*(.*?)\*/g, '<span class="msg-bold">$1</span>')
            .replace(/_(.*?)_/g, '<span class="msg-italic">$1</span>')
            .replace(/```([\s\S]*?)```/g, '<span class="msg-code-block">$1</span>')
            .replace(/`([^`]+)`/g, '<span class="msg-code">$1</span>')
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="msg-link">$1</a>');
  }

  function sanitize(str) {
    const div = document.createElement('div'); div.textContent = str; return div.innerHTML;
  }

  // Emojis / Pickers
  function initEmojiPicker() {
    emojiGrid.innerHTML = emojiData['smileys'].map(e=>`<button class="emj">${e}</button>`).join('');
    emojiTabs.onclick = (e) => {
      if(e.target.classList.contains('emoji-tab')){
        document.querySelectorAll('.emoji-tab').forEach(t=>t.classList.remove('active'));
        e.target.classList.add('active');
        emojiGrid.innerHTML = emojiData[e.target.dataset.category].map(em=>`<button class="emj">${em}</button>`).join('');
      }
    };
    emojiGrid.onclick = (e) => {
      if(e.target.classList.contains('emj')){ messageInput.value += e.target.textContent; messageInput.focus(); }
    };
  }

  emojiBtn.onclick = (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('hidden');
    emojiBtn.classList.toggle('active');
  };

  document.addEventListener('click', (e) => {
    if(!emojiPicker.contains(e.target) && e.target !== emojiBtn && !emojiBtn.contains(e.target)){
      emojiPicker.classList.add('hidden'); emojiBtn.classList.remove('active');
    }
    if(!reactionPicker.contains(e.target)){ reactionPicker.classList.add('hidden'); activeReactionMsgId=null; }
  });

  function showReactionPicker(e, msgId, wrap) {
    e.stopPropagation();
    activeReactionMsgId = msgId;
    const rect = e.target.getBoundingClientRect();
    reactionPicker.style.top = `${rect.top - 50}px`;
    reactionPicker.style.left = `${rect.left}px`;
    if (rect.left + reactionPicker.offsetWidth > window.innerWidth) reactionPicker.style.left = `${window.innerWidth - reactionPicker.offsetWidth - 10}px`;
    reactionPicker.classList.remove('hidden');
  }

  reactionPicker.querySelectorAll('.reaction-quick').forEach(b => {
    b.onclick = () => {
      if (activeReactionMsgId) socket.emit('add-reaction', { messageId: activeReactionMsgId, emoji: b.dataset.emoji });
      reactionPicker.classList.add('hidden');
    };
  });

  // Lightbox
  window.openLightbox = (src) => { lightboxImg.src = src; lightbox.classList.remove('hidden'); };
  lightboxClose.onclick = () => lightbox.classList.add('hidden');

  // Sidebar mobile
  menuBtn.onclick = () => { sidebar.classList.add('open'); sidebarOverlay.classList.add('active'); };
  sidebarClose.onclick = sidebarOverlay.onclick = () => { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('active'); };

  // Toasts
  function showToast(title, text) {
    const d = document.createElement('div'); d.className = 'toast';
    d.innerHTML = `<div class="toast-avatar" style="background:${getAvatarColor(title)}">${title.charAt(0)}</div><div class="toast-body"><div class="toast-title">${title}</div><div class="toast-text">${text}</div></div>`;
    toastContainer.appendChild(d);
    setTimeout(() => { d.classList.add('removing'); setTimeout(()=>d.remove(), 300); }, 3000);
  }

  // Theme
  function initTheme() {
    const saved = localStorage.getItem('chatwave_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  }
  themeToggle.onclick = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const nt = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nt);
    localStorage.setItem('chatwave_theme', nt);
  };

  function playSound(type) {} // mocked

  // Typing logic
  messageInput.addEventListener('input', () => {
    if(!isTyping) { isTyping=true; socket.emit('typing', { channel: activeChannel, to: activeChannel }); }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(clearTyping, 2000);
  });
  function clearTyping() { if(isTyping) { isTyping=false; socket.emit('stop-typing', { channel: activeChannel, to: activeChannel }); } }
  
  function updateTypingIndicator() {
    const tg = typingUsers[activeChannel] || new Set();
    const arr = Array.from(tg).filter(x => x !== myUsername);
    if(arr.length===0) { typingEl.innerHTML = ''; }
    else if(arr.length===1) { typingEl.innerHTML = `${arr[0]} is typing<span class="typing-dots"><span></span><span></span><span></span></span>`; }
    else { typingEl.innerHTML = `Multiple people are typing...`; }
  }

})();
