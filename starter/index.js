const fs = require('fs/promises');
const fsSync = require('fs');
const http = require('http');
const path = require('path');
const slugify = require('slugify');
const replaceTemplate = require('./modules/replaceTemplate');

/////////////////////////////////
// SERVER

// Funcție pentru citirea template-urilor
async function loadTemplates() {
  const tempOverview = await fs.readFile(
    path.join(__dirname, 'templates', 'template-overview.html'),
    'utf-8'
  );
  const tempCard = await fs.readFile(
    path.join(__dirname, 'templates', 'template-card.html'),
    'utf-8'
  );
  const tempProduct = await fs.readFile(
    path.join(__dirname, 'templates', 'template-product.html'),
    'utf-8'
  );
  return { tempOverview, tempCard, tempProduct };
}

// Funcție pentru citirea datelor JSON
async function loadData() {
  try {
    const data = await fs.readFile(
      path.join(__dirname, 'dev-data', 'data.json'),
      'utf-8'
    );
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading data.json:', err);
    process.exit(1);
  }
}

// Helper pentru trimiterea răspunsului
const sendResponse = (res, statusCode, contentType, content) => {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(content);
};

// Servește fișiere statice (inclusiv video)
async function serveStaticFile(req, res) {
  const filePath = path.join(__dirname, req.url);
  const ext = path.extname(filePath).toLowerCase();

  // Tipuri MIME de bază
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.svg': 'image/svg+xml',
  };

  if (!mimeTypes[ext]) return false; // nu e un fișier static recunoscut

  try {
    if (ext.startsWith('.mp')) {
      // pentru video-uri – citire streaming
      const stat = fsSync.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext],
        'Content-Length': stat.size,
      });
      fsSync.createReadStream(filePath).pipe(res);
    } else {
      // pentru restul fișierelor
      const data = await fs.readFile(filePath);
      sendResponse(res, 200, mimeTypes[ext], data);
    }
    return true;
  } catch {
    sendResponse(res, 404, 'text/html', '<h1>Static file not found</h1>');
    return true;
  }
}

// Funcția principală
async function startServer() {
  const { tempOverview, tempCard, tempProduct } = await loadTemplates();
  const dataObj = await loadData();

  // Generare slug-uri
  const slugs = dataObj.map(el => slugify(el.productName, { lower: true }));
  console.log('Slugs:', slugs);

  const server = http.createServer(async (req, res) => {
    const myURL = new URL(req.url, `http://${req.headers.host}`);
    const pathname = myURL.pathname;
    const query = myURL.searchParams;

    console.log(`${req.method} ${pathname}`);

    // Înainte de orice — verificăm dacă e fișier static
    const isStatic = await serveStaticFile(req, res);
    if (isStatic) return;

    // Overview page
    if (pathname === '/' || pathname === '/overview') {
      const cardsHtml = dataObj.map(el => replaceTemplate(tempCard, el)).join('');
      const output = tempOverview.replace('{%PRODUCT_CARDS%}', cardsHtml);
      sendResponse(res, 200, 'text/html', output);

    // Product page
    } else if (pathname === '/product') {
      const id = Number(query.get('id'));
      if (!Number.isInteger(id) || id < 0 || id >= dataObj.length) {
        sendResponse(res, 404, 'text/html', '<h1>Product not found!</h1>');
      } else {
        const product = dataObj[id];
        const output = replaceTemplate(tempProduct, product);
        sendResponse(res, 200, 'text/html', output);
      }

    // API page
    } else if (pathname === '/api') {
      sendResponse(res, 200, 'application/json', JSON.stringify(dataObj));

    // Not found
    } else {
      sendResponse(res, 404, 'text/html', '<h1>Page not found!</h1>');
    }
  });

  server.listen(8000, '127.0.0.1', () => {
    console.log('🚀 Server running on http://127.0.0.1:8000');
  });
}

// Start
startServer();
