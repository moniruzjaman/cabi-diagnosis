const fs = require('fs');
const lines = fs.readFileSync('src/App.jsx', 'utf8').split('\n');
let stack = [];
let brace = 0;
let inStr = null;
for (let li = 0; li < lines.length; li++) {
  const line = lines[li];
  const ln = li + 1;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (inStr) {
      if (ch === inStr && line[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '{' && next !== '/' && next !== '*') { brace++; continue; }
    if (ch === '{' && next === '/' && line[i + 2] === '*') {
      const rest = line.slice(i);
      const e = rest.indexOf('*/}');
      if (e >= 0) { i = i + e + 2; continue; }
      li = lines.length; break;
    }
    if (ch === '}' && brace > 0) { brace--; continue; }
    if (brace > 0) continue;
    if (ch === '<') {
      if (next === '/') {
        const m = line.slice(i).match(/<\/([A-Za-z0-9]+)/);
        if (m) {
          stack.pop();
          if (stack.length === 0) console.log('ROOT CLOSED at line', ln, '</' + m[1] + '>');
          i = i + m[0].length - 1; continue;
        }
      } else if (/[A-Za-z]/.test(next)) {
        const m = line.slice(i).match(/<([A-Za-z][A-Za-z0-9]*)/);
        if (m) {
          const rest = line.slice(i + m[0].length);
          const sameLineSelfClose = /\/>/.test(rest.split('<')[0].split('{')[0]);
          if (!sameLineSelfClose) {
            stack.push(m[1]);
            if (stack.length === 1) console.log('ROOT OPEN at line', ln, '<' + m[1] + '>');
          }
          i = i + m[0].length - 1; continue;
        }
      }
    }
  }
}
console.log('END stack size', stack.length);
