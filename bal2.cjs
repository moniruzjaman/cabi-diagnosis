const fs = require('fs');
function scan(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let inStr = null, strEsc = false;
  let inLineComment = false, inBlockComment = false;
  const stack = [];
  const tagPrev = new Set(['<', '>', '{', '}', '(', ')', ',', ':', '=', '[', '?']);
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
      if (ch === '<') {
        if (next === '/') { // close tag
          const m = line.slice(i).match(/<\/([A-Za-z][A-Za-z0-9]*)/);
          if (m) {
            const top = stack[stack.length - 1];
            if (!top || top.name !== m[1]) {
              // mismatch
              stack.push({ name: 'MISMATCH/' + m[1], line: li + 1 });
            } else stack.pop();
            i += m[0].length - 1; continue;
          }
        } else if (/[A-Za-z]/.test(next)) {
          // possible open tag: check previous significant char
          let j = i - 1, prev = '';
          while (j >= 0 && /\s/.test(line[j])) j--;
          if (j >= 0) prev = line[j];
          if (tagPrev.has(prev) || j < 0) {
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
  }
  return stack;
}
const st = scan(process.argv[2]);
if (st.length === 0) console.log(process.argv[2], '=> BALANCED');
else console.log(process.argv[2], '=> UNCLOSED/MISMATCH:', st.map(s => s.name + '@' + s.line).join(', '));
