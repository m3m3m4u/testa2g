const http = require('http');
const data = JSON.stringify({ question: 'Nennen Sie drei Begriffe, die die Personenzentrierung in der Pflege beschreiben.', answer: 'Fokus auf Bedürfnisse, Mensch im Zentrum, ganzheitliche Betreuung' });

const opts = { hostname: 'localhost', port: 3000, path: '/api/evaluate', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };

const req = http.request(opts, res => {
  let buf = '';
  res.on('data', d => buf += d.toString());
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log(buf);
  });
});
req.on('error', e => { console.error('ERR', e.message); });
req.write(data); req.end();
