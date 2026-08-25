const fs = require('fs');
const parser = require('@babel/parser');
const code = fs.readFileSync('src/App.jsx', 'utf8');
let ast;
try {
  ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
} catch (e) {
  ast = e.ast || null;
  if (!ast) { console.log('parse threw', e.message); process.exit(0); }
}
const unclosed = [];
function walk(node) {
  if (!node || typeof node.type !== 'string') return;
  if (node.type === 'JSXElement' && !node.closingElement) {
    const n = node.openingElement.name;
    const name = n && (n.name || (n.namespace ? n.namespace.name + ':' + n.name.name : '?'));
    unclosed.push((node.loc && node.loc.start.line) + ':' + name);
  }
  if (node.type === 'JSXFragment' && !node.closingFragment) {
    unclosed.push((node.loc && node.loc.start.line) + ':<>');
  }
  for (const k in node) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'range' || k === 'leadingComments' || k === 'trailingComments' || k === 'innerComments') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v.type === 'string') walk(v);
  }
}
walk(ast.program || ast);
console.log('UNClosed JSX (line:name):');
console.log(unclosed.slice(0, 40).join('\n'));
