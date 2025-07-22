const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001, host: '0.0.0.0' });

let statusByWashroom = {
  boys: { status: 'vacant', user: '' },
  girls: { status: 'vacant', user: '' }
};

let connectedUsers = new Map();

function broadcastUpdate(washroom) {
  const payload = {
    type: 'update',
    washroom,
    status: statusByWashroom[washroom].status,
    user: statusByWashroom[washroom].user
  };

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
}

function broadcastUsers() {
  const users = Array.from(connectedUsers.values());
  const payload = {
    type: 'users',
    users
  };

  console.log("📢 Broadcasting users:", users);

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(payload));
    }
  });
}

wss.on('connection', (ws) => {
  console.log("✅ New client connected.");

  // Send initial washroom status
  ws.send(JSON.stringify({
    type: 'init',
    statusByWashroom,
    users: Array.from(connectedUsers.values())
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'update') {
        const { washroom, status, user } = data;

        statusByWashroom[washroom] = {
          status,
          user: user || ''
        };

        broadcastUpdate(washroom);

      } else if (data.type === 'register') {
        if (data.name && data.gender) {
          connectedUsers.set(ws, { name: data.name, gender: data.gender });
          broadcastUsers();  // ✅ Trigger on register
        }
      }
    } catch (err) {
      console.error("❌ Error parsing message:", err.message);
    }
  });

  ws.on('close', () => {
    connectedUsers.delete(ws);
    broadcastUsers();  // ✅ Trigger on disconnect
  });
});

console.log("🚀 Server running at ws://0.0.0.0:3001");
