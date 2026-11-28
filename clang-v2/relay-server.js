#!/usr/bin/env node
/* =========================================================================
   CLANG! V2 · 联机中继（最小实现，房间内广播）
   用法：  npm i ws  &&  node relay-server.js
           PORT=8080 node relay-server.js
   前端：在「部署 → 联机 ONLINE (WS)」里填 ws://你的IP:8080（https 页面上需 wss）
   协议：文本帧 JSON，字段 t / room / sid，服务端只做房间内转发 + peers 名单，
        不做权威结算 —— 想加权威后端时，替换本文件里的转发逻辑即可。
   ========================================================================= */
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 8080);
const rooms = new Map();   // room -> Set<ws>

const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ ok: true, rooms: rooms.size })); }
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('CLANG! relay is up. Connect with WebSocket and send {"t":"join","room":"SCRAP-01","sid":"abc123"}\n');
});

const wss = new WebSocketServer({ server });

function peers(room) {
  const set = rooms.get(room);
  return set ? [...set].map(w => w.sid).filter(Boolean) : [];
}
function broadcast(room, msg, except) {
  const set = rooms.get(room);
  if (!set) return;
  const text = JSON.stringify(msg);
  for (const c of set) if (c !== except && c.readyState === 1) c.send(text);
}

wss.on('connection', ws => {
  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw.toString()); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;

    if (m.t === 'join') {
      ws.room = String(m.room || 'LOBBY');
      ws.sid = String(m.sid || Math.random().toString(36).slice(2, 8));
      m.sid = ws.sid; m.room = ws.room;
      if (!rooms.has(ws.room)) rooms.set(ws.room, new Set());
      rooms.get(ws.room).add(ws);
      broadcast(ws.room, m, ws);                                  // 通知别人"有人进来"
      ws.send(JSON.stringify({ t: 'peers', room: ws.room, sid: 'server', list: peers(ws.room) }));
      console.log(`[join] ${ws.room} / ${ws.sid} (${rooms.get(ws.room).size} online)`);
      return;
    }
    if (!ws.room) return;
    broadcast(ws.room, m, ws);
  });

  ws.on('close', () => {
    if (!ws.room) return;
    const set = rooms.get(ws.room);
    if (set) {
      set.delete(ws);
      if (set.size === 0) rooms.delete(ws.room);
    }
    broadcast(ws.room, { t: 'bye', room: ws.room, sid: ws.sid });
    console.log(`[bye] ${ws.room} / ${ws.sid}`);
  });
});

server.listen(PORT, () => console.log(`CLANG! relay listening on :${PORT}  (ws://0.0.0.0:${PORT})`));
