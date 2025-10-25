const fs = require('fs');
const http = require('http');
const path = require('path');
const slugify = require('slugify');
const replaceTemplate = require('./modules/replaceTemplate');

/////////////////////////////////
// SERVER

// Citire fișiere template
const tempOverview = fs.readFileSync(
  path.join(__dirname, 'templates', 'template-overview.html'),
  'utf-8'
);
const tempCard = fs.readFileSync(
  path.join(__dirname, 'templates', 'template-card.html'),
  'utf-8'
);
const tempProduct = fs.readFileSync(
  path.join(__dirname, 'templates', 'template-product.html'),
  'utf-8'
);

// Citire date JSON
let dataObj = [];
try {
  const data = fs.readFileSync(
    path.join(__dirname, 'dev-data', 'data.json'),
    'utf-8'
  );
  dataObj = JSON.parse(data);
} catch (err) {
  console.error('Error reading data.json:', err);
  process.exit(1); // oprește serverul dacă nu există date
}

// Generare slug-uri
const slugs = dataObj.map(el => slugify(el.productName, { lower: true }));
console.log(slugs);

// Helper pentru trimitere răspuns
const sendResponse = (res, statusCode, contentType, content) => {
  res.writeHead(statusCode, { 'Content-type': contentType });
  res.end(content);
};

// Creare server
const server = http.createServer((req, res) => {
  const myURL = new URL(req.url, `http://${req.headers.host}`);
  const pathname = myURL.pathname;
  const query = myURL.searchParams;

  console.log(`${req.method} ${pathname}`); // log request

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

// Pornire server
server.listen(8000, '127.0.0.1', () => {
  console.log('Listening to requests on port 8000');
});
