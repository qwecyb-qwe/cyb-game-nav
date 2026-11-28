/* =========================================================================
   CLANG! V2 · 联机中继（Cloudflare Worker + Durable Object）
   永久部署（免费额度足够小规模联机）：
     npm i -g wrangler && wrangler login
     wrangler init clang-relay            # 选 Worker
     把本文件内容放进 src/index.js 或直接 wrangler deploy relay-worker.js
     wrangler deploy
   → 得到 https://clang-relay.<你的子域>.workers.dev
   游戏里填：wss://clang-relay.<你的子域>.workers.dev/ws?room=SCRAP-01
   说明：Durable Object 按房间名分片，房间内广播；不做权威结算。
   ========================================================================= */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(JSON.stringify({ ok: true, service: 'clang-relay' }), {
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
      });
    }
    // /ws?room=XXX  → 路由到房间对应的 Durable Object
    const room = (url.searchParams.get('room') || 'LOBBY').slice(0, 32).toUpperCase();
    const stub = env.ROOMS.get(env.ROOMS.idFromName(room));
    return stub.fetch(request);
  }
};

export class Room {
  constructor(state, env) {
    this.sessions = new Map();   // sid -> ws
    this.state = state;
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.accept();
    let sid = null;

    server.addEventListener('message', ev => {
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (!m) return;
      if (m.t === 'join') {
        sid = String(m.sid || Math.random().toString(36).slice(2, 8));
        this.sessions.set(sid, server);
        server.send(JSON.stringify({ t: 'peers', sid: 'server', room: m.room, list: [...this.sessions.keys()] }));
        this.broadcast({ ...m, sid, room: m.room }, server);
        return;
      }
      if (!sid) return;
      this.broadcast({ ...m, sid }, server);
    });

    server.addEventListener('close', () => {
      if (sid) {
        this.sessions.delete(sid);
        this.broadcast({ t: 'bye', sid, room: 'ROOM' }, null);
      }
    });
    server.addEventListener('error', () => {
      if (sid) { this.sessions.delete(sid); }
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  broadcast(msg, except) {
    const text = JSON.stringify(msg);
    for (const [id, ws] of this.sessions) {
      if (ws === except) continue;
      try { ws.send(text); } catch (e) { this.sessions.delete(id); }
    }
  }
}
