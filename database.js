const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');

async function initDb() {
  // Ensure we don't crash if dir doesn't exist
  const db = await open({
    filename: './chatwave.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel TEXT NOT NULL, -- 'global' or 'private'
      sender_name TEXT NOT NULL,
      target_user TEXT, 
      text TEXT,
      image_url TEXT,
      voice_url TEXT,
      reply_to TEXT,
      is_deleted INTEGER DEFAULT 0,
      is_edited INTEGER DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reactions (
      message_id TEXT NOT NULL,
      user_username TEXT NOT NULL,
      emoji TEXT NOT NULL,
      PRIMARY KEY (message_id, user_username, emoji)
    );
    
    CREATE TABLE IF NOT EXISTS read_receipts (
      message_id TEXT NOT NULL,
      read_by_username TEXT NOT NULL,
      PRIMARY KEY (message_id, read_by_username)
    );
  `);

  return db;
}

module.exports = { initDb };
