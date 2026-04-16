const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./chatwave.db');
db.all("SELECT * FROM messages WHERE channel = 'global'", [], (err, rows) => {
  console.log('Result total: ', rows.length);
  if (rows.length > 0) {
    console.log(rows[0]);
  }
});
