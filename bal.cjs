const fs = require('fs');
function scan(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let inStr = null, strEsc = false;
  let inLineComment = false, inBlockComment = false;
  let brace = 0;
  const stack = [];
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    inLineComment = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i], next = line[i + 1];
      if (inBlockComment) { if (ch === '*' && next === '/') { inBlockComment = false; i++; } continue; }
      if (inLineComment) continue;
      if (inStr) {
        if (strEsc) { strEsc = false; continue; }
        if (ch === inStr) { inStr = null; continue; }
        if (ch === '\\') { strEsc = true; continue; }
        continue;
      }
      if (ch === '/' && next === '/') { inLineComment = true; break; }
      if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
      if (ch === '{') { brace++; continue; }
      if (ch === '}') { if (brace > 0) brace--; continue; }
      if (ch === '<') {
        if (next === '/') {
          const m = line.slice(i).match(/<\/([A-Za-z0-9]+)/);
          if (m) { stack.pop(); i += m[0].length - 1; continue; }
        } else if (/[A-Za-z]/.test(next)) {
          const m = line.slice(i).match(/<([A-Za-z][A-Za-z0-9]*)/);
          if (m) {
            const rest = line.slice(i + m[0].length);
            const self = /\/>/.test(rest.split('<')[0].split('{')[0]);
            if (!self) stack.push({ name: m[1], line: li + 1 });
            i += m[0].length - 1; continue;
          }
        }
      }
    }
  }
  return stack;
}
const file = process.argv[2];
const st = scan(file);
if (st.length === 0) console.log(file, '=> BALANCED');
else console.log(file, '=> UNCLOSED:', st.map(s => s.name + '@' + s.line).join(', '));
