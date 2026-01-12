/**
 * 集成测试 - 模拟完整的通话过程
 * 测试场景：
 * 1. Caller 生成链接
 * 2. Caller 加入房间
 * 3. Callee 加入房间
 * 4. 交换 WebRTC offer/answer
 * 5. 交换 ICE candidates
 * 6. 传输文本数据
 * 7. 挂断通话
 */

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

let server;
let io;
let app;

// 启动测试服务器
async function startTestServer(port = 3002) {
  return new Promise((resolve) => {
    app = express();
    const httpServer = http.createServer(app);
    io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    app.use(express.json());

    const rooms = new Map();

    // 生成链接
    app.post('/api/call/generate', (req, res) => {
      const roomId = uuidv4();
      const seedBytes = Buffer.allocUnsafe(32);
      for (let i = 0; i < 32; i++) {
        seedBytes[i] = Math.floor(Math.random() * 256);
      }
      const seed = seedBytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

      rooms.set(roomId, {
        seed,
        caller: null,
        callee: null,
        createdAt: Date.now()
      });

      res.json({ roomId, seed, link: `http://localhost:3000/join?roomId=${roomId}&seed=${seed}` });
    });

    // WebSocket 处理
    io.on('connection', (socket) => {
      socket.on('caller-join', (data) => {
        const { roomId, seed } = data;
        if (!rooms.has(roomId)) {
          rooms.set(roomId, { seed, caller: null, callee: null, createdAt: Date.now() });
        }
        const room = rooms.get(roomId);
        room.caller = socket.id;
        socket.join(roomId);
        socket.emit('caller-ready');
      });

      socket.on('callee-join', (data) => {
        const { roomId } = data;
        if (!rooms.has(roomId)) {
          socket.emit('error', { message: '房间不存在' });
          return;
        }
        const room = rooms.get(roomId);
        room.callee = socket.id;
        socket.join(roomId);
        io.to(room.caller).emit('callee-joined');
        socket.emit('callee-ready');
      });

      socket.on('offer', (data) => {
        const { roomId, offer } = data;
        const room = rooms.get(roomId);
        if (!room) return;
        io.to(room.callee).emit('offer', { offer });
      });

      socket.on('answer', (data) => {
        const { roomId, answer } = data;
        const room = rooms.get(roomId);
        if (!room) return;
        io.to(room.caller).emit('answer', { answer });
      });

      socket.on('ice-candidate', (data) => {
        const { roomId, candidate } = data;
        const room = rooms.get(roomId);
        if (!room) return;
        const targetId = room.caller === socket.id ? room.callee : room.caller;
        io.to(targetId).emit('ice-candidate', { candidate });
      });

      socket.on('text-message', (data) => {
        const { roomId, message } = data;
        const room = rooms.get(roomId);
        if (!room) return;
        const targetId = room.caller === socket.id ? room.callee : room.caller;
        io.to(targetId).emit('text-message', { message, from: socket.id });
      });

      socket.on('hangup', (data) => {
        const { roomId } = data;
        const room = rooms.get(roomId);
        if (!room) return;
        const otherParty = room.caller === socket.id ? room.callee : room.caller;
        io.to(otherParty).emit('hangup');
        socket.leave(roomId);
        rooms.delete(roomId);
      });

      socket.on('disconnect', () => {
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

    server = httpServer.listen(port, () => {
      console.log(`Test server listening on port ${port}`);
      resolve();
    });
  });
}

// 停止测试服务器
function stopTestServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('Test server stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// 连接客户端
function connectClient(port = 3002) {
  return new Promise((resolve) => {
    const socket = ioClient(`http://localhost:${port}`, {
      reconnection: true,
      reconnectionDelay: 100,
      reconnectionDelayMax: 500
    });
    
    socket.on('connect', () => {
      resolve(socket);
    });
  });
}

describe('Integration Tests - Full Call Flow', () => {
  beforeAll(async () => {
    await startTestServer(3002);
  });

  afterAll(async () => {
    await stopTestServer();
  });

  test('should complete full call flow: caller join -> callee join -> offer/answer -> hangup', async () => {
    jest.setTimeout(10000);

    // 1. 生成链接
    const generateResponse = await fetch('http://localhost:3002/api/call/generate', {
      method: 'POST'
    });
    const { roomId, seed } = await generateResponse.json();
    expect(roomId).toBeTruthy();
    expect(seed).toBeTruthy();

    // 2. Caller 连接
    const callerSocket = await connectClient(3002);
    const callerReady = new Promise((resolve) => {
      callerSocket.on('caller-ready', () => resolve());
    });
    callerSocket.emit('caller-join', { roomId, seed });
    await callerReady;
    expect(callerSocket.connected).toBe(true);

    // 3. Callee 连接
    const calleeSocket = await connectClient(3002);
    const calleeReady = new Promise((resolve) => {
      calleeSocket.on('callee-ready', () => resolve());
    });
    const calleeJoined = new Promise((resolve) => {
      callerSocket.on('callee-joined', () => resolve());
    });
    calleeSocket.emit('callee-join', { roomId });
    await Promise.all([calleeReady, calleeJoined]);
    expect(calleeSocket.connected).toBe(true);

    // 4. 交换 Offer/Answer
    const mockOffer = { type: 'offer', sdp: 'mock-sdp-offer' };
    const mockAnswer = { type: 'answer', sdp: 'mock-sdp-answer' };

    const offerReceived = new Promise((resolve) => {
      calleeSocket.on('offer', (data) => {
        expect(data.offer).toEqual(mockOffer);
        resolve();
      });
    });

    callerSocket.emit('offer', { roomId, offer: mockOffer });
    await offerReceived;

    const answerReceived = new Promise((resolve) => {
      callerSocket.on('answer', (data) => {
        expect(data.answer).toEqual(mockAnswer);
        resolve();
      });
    });

    calleeSocket.emit('answer', { roomId, answer: mockAnswer });
    await answerReceived;

    // 5. 交换 ICE Candidates
    const mockCandidate = { candidate: 'candidate-mock', sdpMid: 'video' };

    const iceCandidateReceived = new Promise((resolve) => {
      calleeSocket.on('ice-candidate', (data) => {
        expect(data.candidate).toEqual(mockCandidate);
        resolve();
      });
    });

    callerSocket.emit('ice-candidate', { roomId, candidate: mockCandidate });
    await iceCandidateReceived;

    // 6. 传输文本信息
    const textMessage = { text: 'Hello, this is encrypted text!' };
    const messageReceived = new Promise((resolve) => {
      calleeSocket.on('text-message', (data) => {
        expect(data.message).toEqual(textMessage);
        resolve();
      });
    });

    callerSocket.emit('text-message', { roomId, message: textMessage });
    await messageReceived;

    // 7. 挂断通话
    const hangupReceived = new Promise((resolve) => {
      calleeSocket.on('hangup', () => resolve());
    });

    callerSocket.emit('hangup', { roomId });
    await hangupReceived;

    // 清理
    callerSocket.disconnect();
    calleeSocket.disconnect();
  });

  test('should handle callee join to non-existent room', async () => {
    jest.setTimeout(5000);

    const calleeSocket = await connectClient(3002);

    const errorReceived = new Promise((resolve) => {
      calleeSocket.on('error', (data) => {
        expect(data.message).toBe('房间不存在');
        resolve();
      });
    });

    calleeSocket.emit('callee-join', { roomId: 'non-existent-room' });
    await errorReceived;

    calleeSocket.disconnect();
  });

  test('should handle peer disconnection', async () => {
    jest.setTimeout(10000);

    const generateResponse = await fetch('http://localhost:3002/api/call/generate', {
      method: 'POST'
    });
    const { roomId, seed } = await generateResponse.json();

    const callerSocket = await connectClient(3002);
    const callerReady = new Promise((resolve) => {
      callerSocket.on('caller-ready', () => resolve());
    });
    callerSocket.emit('caller-join', { roomId, seed });
    await callerReady;

    const calleeSocket = await connectClient(3002);
    const calleeReady = new Promise((resolve) => {
      calleeSocket.on('callee-ready', () => resolve());
    });
    calleeSocket.emit('callee-join', { roomId });
    await calleeReady;

    // Caller 断开连接
    const peerDisconnected = new Promise((resolve) => {
      calleeSocket.on('peer-disconnected', () => resolve());
    });

    callerSocket.disconnect();
    await peerDisconnected;

    calleeSocket.disconnect();
  });
});
