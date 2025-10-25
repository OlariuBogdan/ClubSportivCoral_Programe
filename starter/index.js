const fs = require('fs');
const url = require('url');
const http = require('http');

////////////////////////////////////////////////////
// Data
// (poți citi fișierul aici o singură dată, dacă vrei)

////////////////////////////////////////////////////////
// Server

const server = http.createServer((req, res) => {
    console.log(req.url);

    const pathName = req.url;

    if (pathName === '/product') {
        res.end('Product');
    } 
    else if (pathName === '/api') {
        fs.readFile(`${__dirname}/dev-data/data.json`, 'utf-8', (err, data) => {
            if (err) {
                res.writeHead(500, {'Content-type': 'text/plain'});
                res.end('Eroare la citirea fișierului!');
                return;
            }

            const productData = JSON.parse(data);
            console.log(productData);

            res.writeHead(200, {'Content-type': 'application/json'});
            res.end(data);
        });
    } 
    else {
        res.writeHead(404, {'Content-type': 'text/plain'});
        res.end('Pagina nu a fost găsită!');
    }
});

server.listen(8000, '127.0.0.1', () => {
    console.log('Ascult la port 8000');
});
