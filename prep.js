const fs = require('fs');
let code = fs.readFileSync('public/app.js', 'utf8');
const debugHeader = `
window.addEventListener("error", function(e) {
  alert("Error: " + e.message + " at " + e.filename + ":" + e.lineno);
});
window.addEventListener("unhandledrejection", function(e) {
  alert("Promise Error: " + (e.reason ? e.reason.message : 'Unknown'));
});
`;
fs.writeFileSync('public/app-v4.js', debugHeader + code);
