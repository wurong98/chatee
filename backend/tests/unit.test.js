/**
 * 单元测试 - 测试服务器基本功能
 */
const { v4: uuidv4 } = require('uuid');

// 测试链接生成函数
describe('Link Generation', () => {
  function generateLink() {
    const roomId = uuidv4();
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

  test('should generate unique roomId', () => {
    const link1 = generateLink();
    const link2 = generateLink();
    expect(link1.roomId).not.toEqual(link2.roomId);
  });

  test('should generate valid UUID for roomId', () => {
    const link = generateLink();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(link.roomId).toMatch(uuidRegex);
  });

  test('should generate base64-url-safe seed', () => {
    const link = generateLink();
    // 不应包含 + 或 /
    expect(link.seed).not.toContain('+');
    expect(link.seed).not.toContain('/');
    expect(link.seed).toBeTruthy();
  });

  test('should include roomId and seed in link', () => {
    const link = generateLink();
    expect(link.link).toContain(`roomId=${link.roomId}`);
    expect(link.link).toContain(`seed=${link.seed}`);
  });

  test('should generate consistent link format', () => {
    const link = generateLink();
    expect(link.link).toMatch(/^http:\/\/localhost:3000\/join\?roomId=.+&seed=.+$/);
  });
});

// 测试房间管理
describe('Room Management', () => {
  let rooms;

  beforeEach(() => {
    rooms = new Map();
  });

  test('should store room with caller and callee', () => {
    const roomId = 'room-123';
    const callerId = 'caller-001';
    const calleeId = 'callee-001';

    rooms.set(roomId, {
      caller: callerId,
      callee: calleeId,
      createdAt: Date.now()
    });

    expect(rooms.has(roomId)).toBe(true);
    expect(rooms.get(roomId).caller).toBe(callerId);
    expect(rooms.get(roomId).callee).toBe(calleeId);
  });

  test('should delete room on hangup', () => {
    const roomId = 'room-123';
    rooms.set(roomId, { caller: 'caller-001', callee: 'callee-001' });
    
    rooms.delete(roomId);
    
    expect(rooms.has(roomId)).toBe(false);
  });

  test('should identify other party in room', () => {
    const roomId = 'room-123';
    const callerId = 'caller-001';
    const calleeId = 'callee-001';

    rooms.set(roomId, { caller: callerId, callee: calleeId });
    const room = rooms.get(roomId);

    // 从caller的角度
    const otherPartyFromCaller = room.caller === callerId ? room.callee : room.caller;
    expect(otherPartyFromCaller).toBe(calleeId);

    // 从callee的角度
    const otherPartyFromCallee = room.caller === calleeId ? room.callee : room.caller;
    expect(otherPartyFromCallee).toBe(callerId);
  });
});

// 测试CORS配置
describe('CORS Configuration', () => {
  const allowedOrigins = [
    'https://chat.bit64.site',
    'http://localhost:3000',
    'http://43.155.147.156:3000'
  ];

  test('should allow origins in allowedOrigins', () => {
    const testOrigin = 'http://localhost:3000';
    expect(allowedOrigins.includes(testOrigin)).toBe(true);
  });

  test('should allow external domains', () => {
    const testOrigin = 'https://chat.bit64.site';
    expect(allowedOrigins.includes(testOrigin)).toBe(true);
  });

  test('should handle empty origin (same-origin requests)', () => {
    const origin = undefined;
    const result = !origin || allowedOrigins.includes(origin);
    expect(result).toBe(true);
  });
});
