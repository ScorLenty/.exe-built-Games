// Сервер TwoDCraft: хранит общий мир и пересылает изменения между игроками.
const { WebSocketServer } = require('ws');
const os = require('os');

const WW = 300, WH = 100;
const COLORS = ['#3aa0c8', '#d9534f', '#5cb85c', '#f0ad4e', '#9b59b6', '#16a085', '#e67e22', '#34495e'];

function localIPs() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const name in nets) {
    for (const i of nets[name]) {
      if (i.family === 'IPv4' && !i.internal) out.push(i.address);
    }
  }
  return out;
}

function startServer({ port = 7777, max = 5, world }) {
  return new Promise((resolve, reject) => {
    const W = Buffer.from(world.w, 'base64');
    const BG = Buffer.from(world.b, 'base64');
    const WL = world.l ? Buffer.from(world.l, 'base64') : Buffer.alloc(WW * WH);
    const hs = world.hs;
    const MODS = world.mod || '';
    let day = world.day;
    const players = new Map(); // ws -> { info, host }
    let nextId = 1;

    const wss = new WebSocketServer({ port, host: '0.0.0.0' });
    const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
    const bcast = (m, except) => {
      const s = JSON.stringify(m);
      for (const [ws] of players) if (ws !== except && ws.readyState === 1) ws.send(s);
    };

    wss.on('error', reject);
    wss.on('listening', () => {
      resolve({
        ok: true,
        port,
        ips: localIPs(),
        stop: () => {
          for (const ws of wss.clients) ws.terminate();
          wss.close();
        }
      });
    });

    wss.on('connection', (ws, req) => {
      ws.on('message', (raw) => {
        let m;
        try { m = JSON.parse(raw); } catch (e) { return; }
        const me = players.get(ws);

        if (!me) {
          if (m.t !== 'join') return;
          if (players.size >= max) { send(ws, { t: 'full' }); ws.close(); return; }
          const id = nextId++;
          const info = {
            id,
            name: String(m.name || 'Игрок').slice(0, 12),
            c: COLORS[(id - 1) % COLORS.length],
            x: WW / 2, y: 0
          };
          const addr = req.socket.remoteAddress || '';
          const isHost = !!m.host && (addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1');
          send(ws, {
            t: 'welcome', id,
            world: { w: W.toString('base64'), b: BG.toString('base64'), l: WL.toString('base64'), hs, day, mod: MODS },
            players: [...players.values()].map((p) => p.info)
          });
          players.set(ws, { info, host: isHost });
          bcast({ t: 'pj', ...info }, ws);
          return;
        }

        if (m.t === 'pos') {
          if (typeof m.x !== 'number' || typeof m.y !== 'number') return;
          me.info.x = m.x; me.info.y = m.y;
          bcast({ t: 'pos', id: me.info.id, x: m.x, y: m.y, f: m.f, v: m.v, h: m.h, s: m.s }, ws);
        } else if (m.t === 'b') {
          if (!Number.isInteger(m.x) || !Number.isInteger(m.y) || m.x < 0 || m.x >= WW || m.y < 0 || m.y >= WH) return;
          const v = m.v & 255;
          (m.l === 2 ? WL : m.l ? BG : W)[m.x + m.y * WW] = v;
          bcast({ t: 'b', l: m.l === 2 ? 2 : m.l ? 1 : 0, x: m.x, y: m.y, v }, ws);
        } else if (m.t === 'day' && me.host) {
          day = m.d;
          bcast({ t: 'day', d: m.d }, ws);
        }
      });

      ws.on('close', () => {
        const me = players.get(ws);
        if (me) {
          players.delete(ws);
          bcast({ t: 'pl', id: me.info.id });
        }
      });
    });
  });
}

module.exports = { startServer };
