import { readFile, writeFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

const file = new URL('../dist/index.html', import.meta.url);
let html = await readFile(file, 'utf8');
const body = renderToString(createElement(MemoryRouter, { initialEntries: ['/'] }, createElement(App)));
const description = 'A no-account, real-time collaborative canvas. Draw, explore and shape ideas together with live Yjs synchronization in an ephemeral guest room.';
html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>FORMA — Ideas take shape. Together.</title>');
html = html.replace(/<meta name="description" content="[^"]*"\s*\/?\s*>/, `<meta name="description" content="${description}" />`);
html = html.replace('</head>', [
  '<meta property="og:type" content="website" />',
  '<meta property="og:site_name" content="FORMA" />',
  '<meta property="og:title" content="FORMA — Ideas take shape. Together." />',
  `<meta property="og:description" content="${description}" />`,
  '<meta property="og:image" content="https://files.manuscdn.com/user_upload_by_module/session_file/310519664068000061/wlaOiAVfUOTGgREJ.png" />',
  '<meta name="twitter:card" content="summary_large_image" />',
  '<meta name="twitter:title" content="FORMA — Ideas take shape. Together." />',
  `<meta name="twitter:description" content="${description}" />`,
  '<meta name="twitter:image" content="https://files.manuscdn.com/user_upload_by_module/session_file/310519664068000061/wlaOiAVfUOTGgREJ.png" />',
  '</head>',
].join('\n'));
await writeFile(file, html);
console.info('Prerendered public landing page and route-specific social metadata into dist/index.html');
