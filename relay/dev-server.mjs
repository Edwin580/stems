// Runs relay/youtube-relay.js locally under Node (same code as the deployed
// Cloudflare Worker) for development:  npm run relay  →  http://127.0.0.1:8788
// Then use http://127.0.0.1:8788 as the YouTube relay in the app.
// Behind an HTTP proxy, start Node with NODE_USE_ENV_PROXY=1 (Node ≥ 22.21).
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { handle } from './youtube-relay.js';

const port = Number(process.env.PORT || 8788);
const env = { ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS };

createServer(async (req, res) => {
  try {
    const request = new Request(`http://127.0.0.1:${port}${req.url}`, { method: req.method, headers: req.headers });
    const response = await handle(request, env.ALLOWED_ORIGINS ? env : {});
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).on('error', () => res.destroy()).pipe(res);
    else res.end();
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(String(err));
  }
}).listen(port, '127.0.0.1', () => console.log(`stems YouTube relay on http://127.0.0.1:${port}`));
