import fs from 'node:fs';
import path from 'node:path';
await import('./generate.mjs');
fs.mkdirSync('dist', { recursive: true });
fs.cpSync('src', 'dist', { recursive: true });
const html=fs.readFileSync('dist/index.html','utf8');
for(const match of html.matchAll(/(?:src|poster|href)="(assets\/[^"#?]+)"/g)) {
  if(!fs.existsSync(path.join('dist',match[1]))) throw new Error(`Missing asset: ${match[1]}`);
}
console.log('Site built; all referenced local assets exist.');
