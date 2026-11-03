import http from 'node:http';
import net from 'node:net';
const PORT = 5175;
const DEFAULT_CLIENT_ID = '';
class DiscordIpcManager {
  constructor(clientId = DEFAULT_CLIENT_ID) {
    this.clientId = clientId;
    this.socket = null;
    this.isReady = false;
    this.connecting = false;
    this.currentActivity = null;
    this.reconnectTimer = null;
  }
  connect() {
    if (this.socket || this.connecting) return;
    this.connecting = true;
    console.log('[Discord Bridge] Connexion à Discord Desktop (\\\\.\\pipe\\discord-ipc-0)...');
    const socket = net.connect('\\\\.\\pipe\\discord-ipc-0', () => {
      console.log('[Discord Bridge] Socket connectée, envoi du Handshake...');
      this.connecting = false;
      this.socket = socket;
      const handshake = JSON.stringify({ v: 1, client_id: this.clientId });
      const len = Buffer.byteLength(handshake);
      const buf = Buffer.alloc(8 + len);
      buf.writeUInt32LE(0, 0);
      buf.writeUInt32LE(len, 4);
      buf.write(handshake, 8);
      socket.write(buf);
    });
    socket.on('data', (data) => {
      try {
        const len = data.readUInt32LE(4);
        const payload = JSON.parse(data.slice(8, 8 + len).toString());
        if (payload.cmd === 'DISPATCH' && payload.evt === 'READY') {
          this.isReady = true;
          const user = payload.data?.user?.username || 'Utilisateur inconnu';
          console.log(`[Discord Bridge] ✅ Connecté avec succès à Discord ! Compte : ${user}`);
          if (this.currentActivity) {
            this.sendActivityToDiscord(this.currentActivity);
          }
        } else if (payload.cmd === 'SET_ACTIVITY') {
          console.log(`[Discord Bridge] 🎵 Statut actif : ${payload.data?.details || 'Rien'} (${payload.data?.state || ''})`);
        }
      } catch (err) {
        console.warn('[Discord Bridge] Erreur lecture message :', err.message);
      }
    });
    socket.on('error', (err) => {
      console.warn('[Discord Bridge] Erreur socket Discord IPC :', err.message);
      this.cleanup();
      this.scheduleReconnect();
    });
    socket.on('close', () => {
      console.log('[Discord Bridge] Socket fermée par Discord.');
      this.cleanup();
      this.scheduleReconnect();
    });
  }
  cleanup() {
    this.isReady = false;
    this.connecting = false;
    if (this.socket) {
      try { this.socket.destroy(); } catch (e) {}
      this.socket = null;
    }
  }
  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 4000);
  }
  updateActivity(activity) {
    this.currentActivity = activity;
    if (!this.socket || !this.isReady) {
      this.connect();
      return { status: 'queued', message: 'En attente de connexion Discord' };
    }
    return this.sendActivityToDiscord(activity);
  }
  sendActivityToDiscord(activity) {
    if (!this.socket || !this.isReady) return { status: 'not_ready' };
    let formattedActivity = null;
    if (activity) {
      let timestamps = undefined;
      if (activity.timestamps) {
        let start = activity.timestamps.start;
        let end = activity.timestamps.end;
        if (start && start > 10000000000) start = Math.floor(start / 1000);
        if (end && end > 10000000000) end = Math.floor(end / 1000);
        if (start) {
          timestamps = {
            start,
            ...(end && end > start ? { end } : {}),
          };
        }
      }
      const actType = typeof activity.type === 'number' ? activity.type : 3;
      formattedActivity = {
        name: activity.name || 'Saez Music',
        type: actType,
        details: (activity.details || activity.name || 'Saez Music').slice(0, 128),
        state: (activity.state || 'Damien Saez').slice(0, 128),
        timestamps,
        assets: {
          large_image: this.clientId,
          large_text: 'Saez Music',
        },
      };
    }
    const msg = JSON.stringify({
      cmd: 'SET_ACTIVITY',
      args: { pid: process.pid, activity: formattedActivity },
      nonce: String(Date.now()),
    });
    const aLen = Buffer.byteLength(msg);
    const aBuf = Buffer.alloc(8 + aLen);
    aBuf.writeUInt32LE(1, 0); 
    aBuf.writeUInt32LE(aLen, 4);
    aBuf.write(msg, 8);
    this.socket.write(aBuf);
    return { status: 'sent', activity: formattedActivity };
  }
}
const ipcManager = new DiscordIpcManager();
ipcManager.connect();
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  if (req.url === '/api/discord-status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      ready: ipcManager.isReady,
      message: ipcManager.isReady ? 'Discord PC connecté' : 'Passerelle active, attente Discord'
    }));
  }
  if (req.url === '/api/discord-activity' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { activity } = JSON.parse(body || '{}');
        const result = ipcManager.updateActivity(activity);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, result }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }
  res.writeHead(404);
  res.end();
});
server.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 Passerelle Discord RPC active en tâche de fond sur http://0.0.0.0:${PORT}`);
});
