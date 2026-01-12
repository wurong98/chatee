const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://43.155.147.156:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://43.155.147.156:3000',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Store active connections: roomId -> { caller, callee }
const rooms = new Map();

/**
 * 生成唯一链接
 * 格式: roomId?seed=xxx
 * 其中roomId用于服务器转发，seed用于客户端密钥推导
 */
function generateLink() {
  const roomId = uuidv4();
  // 生成随机种子（Base64编码）
  const seedBytes = Buffer.allocUnsafe(32);
  for (let i = 0; i < 32; i++) {
    seedBytes[i] = Math.floor(Math.random() * 256);
  }
  const seed = seedBytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  
  return {
    roomId,
    seed,
    link: `http://localhost:3000/join?roomId=${roomId}&seed=${seed}`
  };
}

// REST API: 生成新的呼叫链接
app.post('/api/call/generate', (req, res) => {
  const { roomId, seed, link } = generateLink();
  
  // 预注册房间
  rooms.set(roomId, {
    seed,
    caller: null,
    callee: null,
    createdAt: Date.now()
  });

  console.log(`[API] 生成新链接: ${roomId}`);
  res.json({
    roomId,
    seed,
    link
  });
});

// WebSocket 事件处理
io.on('connection', (socket) => {
  console.log(`[WS] 用户连接: ${socket.id}`);

  /**
   * 发起者加入房间
   */
  socket.on('caller-join', (data) => {
    const { roomId, seed } = data;
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { seed, caller: null, callee: null, createdAt: Date.now() });
    }

    const room = rooms.get(roomId);
    room.caller = socket.id;
    socket.join(roomId);

    console.log(`[WS] 发起者加入: ${socket.id} -> 房间 ${roomId}`);
    socket.emit('caller-ready');
  });

  /**
   * 被呼叫者加入房间
   */
  socket.on('callee-join', (data) => {
    const { roomId } = data;

    if (!rooms.has(roomId)) {
      socket.emit('error', { message: '房间不存在' });
      return;
    }

    const room = rooms.get(roomId);
    room.callee = socket.id;
    socket.join(roomId);

    console.log(`[WS] 被呼叫者加入: ${socket.id} -> 房间 ${roomId}`);
    
    // 通知发起者有人加入
    io.to(room.caller).emit('callee-joined');
    socket.emit('callee-ready');
  });

  /**
   * 转发 WebRTC offer (SDP)
   */
  socket.on('offer', (data) => {
    const { roomId, offer } = data;
    const room = rooms.get(roomId);
    if (!room) return;

    // 发起者的offer转发给被呼叫者
    io.to(room.callee).emit('offer', { offer });
    console.log(`[WS] 转发 offer: ${socket.id} -> ${room.callee}`);
  });

  /**
   * 转发 WebRTC answer (SDP)
   */
  socket.on('answer', (data) => {
    const { roomId, answer } = data;
    const room = rooms.get(roomId);
    if (!room) return;

    // 被呼叫者的answer转发给发起者
    io.to(room.caller).emit('answer', { answer });
    console.log(`[WS] 转发 answer: ${socket.id} -> ${room.caller}`);
  });

  /**
   * 转发 ICE 候选
   */
  socket.on('ice-candidate', (data) => {
    const { roomId, candidate } = data;
    const room = rooms.get(roomId);
    if (!room) return;

    // 转发给对方
    const targetId = room.caller === socket.id ? room.callee : room.caller;
    io.to(targetId).emit('ice-candidate', { candidate });
    console.log(`[WS] 转发 ICE: ${socket.id} -> ${targetId}`);
  });

  /**
   * 挂断通话
   */
  socket.on('hangup', (data) => {
    const { roomId } = data;
    const room = rooms.get(roomId);
    if (!room) return;

    const otherParty = room.caller === socket.id ? room.callee : room.caller;
    io.to(otherParty).emit('hangup');
    console.log(`[WS] 挂断: ${socket.id} (房间 ${roomId})`);

    socket.leave(roomId);
    rooms.delete(roomId);
  });

  socket.on('disconnect', () => {
    console.log(`[WS] 用户断开: ${socket.id}`);
    
    // 清理所有包含该用户的房间
    for (const [roomId, room] of rooms.entries()) {
      if (room.caller === socket.id || room.callee === socket.id) {
        const otherParty = room.caller === socket.id ? room.callee : room.caller;
        if (otherParty) {
          io.to(otherParty).emit('peer-disconnected');
        }
        rooms.delete(roomId);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[Server] 信令服务器启动在 http://localhost:${PORT}`);
});
