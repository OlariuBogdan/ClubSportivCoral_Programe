const fs = require('fs/promises');
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
    process.exit(1); // oprește serverul dacă nu există date
  }
}

// Helper pentru trimitere răspuns
const sendResponse = (res, statusCode, contentType, content) => {
  res.writeHead(statusCode, { 'Content-type': contentType });
  res.end(content);
};

// Funcție principală pentru pornire server
async function startServer() {
  const { tempOverview, tempCard, tempProduct } = await loadTemplates();
  const dataObj = await loadData();

  // Generare slug-uri
  const slugs = dataObj.map(el => slugify(el.productName, { lower: true }));
  console.log('Slugs:', slugs);

  const server = http.createServer((req, res) => {
    const myURL = new URL(req.url, `http://${req.headers.host}`);
    const pathname = myURL.pathname;
    const query = myURL.searchParams;

    console.log(`${req.method} ${pathname}`);

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

    // API
    } else if (pathname === '/api') {
      sendResponse(res, 200, 'application/json', JSON.stringify(dataObj));

    // Not found
    } else {
      sendResponse(res, 404, 'text/html', '<h1>Page not found!</h1>');
    }
  });

  server.listen(8000, '127.0.0.1', () => {
    console.log('Server running on http://127.0.0.1:8000');
  });
}

// Pornire server
startServer();
