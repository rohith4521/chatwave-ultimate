const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');
const html = fs.readFileSync('public/index.html', 'utf8');
const m = app.match(/document\.getElementById\('([^']+)'\)/g);
if (m) {
  m.forEach(x => {
    const id = x.match(/'([^']+)'/)[1];
    if (!html.includes('id="' + id + '"')) console.log('MISSING:', id);
  });
}
