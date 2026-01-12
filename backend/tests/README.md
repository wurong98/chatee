# WebRTC 信令服务器 - 测试文档

## 概述

本项目包含三种类型的测试：
- **单元测试**: 测试独立的函数和模块
- **集成测试**: 测试完整的通话流程
- **CLI 测试**: 模拟真实场景的手动测试工具

## 测试架构

```
tests/
├── unit.test.js          # 单元测试
├── integration.test.js   # 集成测试
└── cli-test.js          # CLI 测试工具
```

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 运行所有测试

```bash
# 运行单元测试和集成测试
npm test

# 以 watch 模式运行（监听文件变化自动运行）
npm run test:watch

# 仅运行集成测试
npm run test:integration
```

### 3. 运行 CLI 测试

首先启动服务器：
```bash
npm start
```

然后在另一个终端运行 CLI 测试：
```bash
npm run test:cli

# 或指定端口
npm run test:cli -- --port 3002

# 查看帮助
npm run test:cli -- --help
```

## 测试详情

### 单元测试 (unit.test.js)

测试内容：
- **链接生成**: 验证唯一的 roomId 和 seed 生成
- **房间管理**: 测试房间存储、删除和查询
- **CORS 配置**: 验证允许的源

```bash
npm test -- tests/unit.test.js
```

### 集成测试 (integration.test.js)

测试完整的通话流程：

1. **链接生成** - 通过 API 生成新链接
2. **Caller 加入** - Caller 连接并加入房间
3. **Callee 加入** - Callee 连接并加入房间
4. **Offer/Answer 交换** - 交换 WebRTC SDP
5. **ICE Candidates 交换** - 交换 ICE 候选
6. **文本传输** - 传输加密文本消息
7. **挂断处理** - 正确处理通话挂断

额外测试：
- 处理非存在的房间加入
- 处理对端断开连接

```bash
npm run test:integration
```

### CLI 测试工具 (cli-test.js)

交互式测试工具，展示完整的通话流程，包括：

**功能特性**：
- ✓ 自动生成通话链接
- ✓ 模拟 Caller 和 Callee 连接
- ✓ 交换 WebRTC offer/answer (SDP)
- ✓ 交换 ICE candidates
- ✓ 传输加密文本消息
- ✓ 模拟通话挂断
- ✓ 详细的彩色输出

**使用方法**：

```bash
# 基本用法（连接到 localhost:3001）
npm run test:cli

# 指定自定义端口
npm run test:cli -- --port 3002

# 查看帮助
npm run test:cli -- --help
```

**示例输出**：
```
ℹ 服务器地址: http://localhost:3001
ℹ 测试开始时间: 2026/1/12 10:30:45

→ 第一步: 生成通话链接
✓ 链接生成成功
  Room ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Seed: eW91cldlYlJUQ1NlZWRCYXNl...
  Link: http://localhost:3000/join?roomId=a1b2c3d4...

→ 第二步: Caller 连接并加入房间
✓ Caller 已连接
✓ Caller 已加入房间

→ 第三步: Callee 连接并加入房间
✓ Callee 已连接
✓ Callee 已加入房间
✓ Caller 已收到 Callee 加入通知

→ 第四步: 交换 WebRTC offer/answer (SDP)
   Caller 发送 Offer (模拟 SDP)...
✓ Callee 已收到 Offer
   Callee 发送 Answer (模拟 SDP)...
✓ Caller 已收到 Answer

→ 第五步: 交换 ICE Candidates
   Caller 发送 ICE Candidate...
✓ Callee 已收到 ICE Candidate
   Callee 发送 ICE Candidate...
✓ Caller 已收到 ICE Candidate

→ 第六步: 传输加密文本消息
   Caller 发送: "Hello from Caller!"
✓ Callee 已接收消息
   Caller 发送: "Hi Caller, I received your message!"
✓ Callee 已接收消息
   Callee 发送: "👋 This is end-to-end encrypted!"
✓ Caller 已接收消息

→ 第七步: 挂断通话
   Caller 发送挂断信号...
✓ Callee 已收到挂断信号
✓ 两端已断开连接

✓ 测试全部通过!
完整的通话流程已验证:
  ✓ 链接生成
  ✓ Caller/Callee 加入
  ✓ Offer/Answer 交换
  ✓ ICE Candidates 交换
  ✓ 文本消息传输
  ✓ 通话挂断
```

## 测试场景覆盖

### WebSocket 事件流

```
客户端              服务器              另一客户端
  |                   |                   |
  |-- caller-join ---->                  |
  |                 (join room)          |
  |                   |                  |
  |                   |                  |
  |                   |                  |
  |                   |<-- callee-join --|
  |                (join room)           |
  |<--- callee-joined---|                |
  |                   |--- callee-ready->|
  |                   |                  |
  |-- offer --------->|-- offer -------->|
  |                   |                  |
  |<------ answer -----| <--- answer ----|
  |                   |                  |
  |-- ice-candidate ->|-- ice-candidate>|
  |<- ice-candidate --|<- ice-candidate-|
  |                   |                  |
  |-- text-message -->|-- text-message ->|
  |<-- text-message --|<- text-message --|
  |                   |                  |
  |-- hangup -------->|-- hangup ------->|
  |                   |                  |
```

## 文本传输说明

虽然这是一个信令服务器，但测试演示了如何通过 Socket.IO 传输文本：

1. **Caller 发送消息**：
   ```javascript
   callerSocket.emit('text-message', { 
     roomId, 
     message: { text: '加密的文本' } 
   });
   ```

2. **服务器转发**：
   ```javascript
   socket.on('text-message', (data) => {
     const targetId = room.caller === socket.id ? room.callee : room.caller;
     io.to(targetId).emit('text-message', { message, from: socket.id });
   });
   ```

3. **Callee 接收消息**：
   ```javascript
   calleeSocket.on('text-message', (data) => {
     console.log('接收到:', data.message.text);
   });
   ```

## 测试配置

### jest.config.js

- **testEnvironment**: node (适用于后端测试)
- **testTimeout**: 30000ms (充分的超时时间)
- **verbose**: true (详细的输出)

### 默认端口

- **服务器**: 3001
- **测试服务器**: 3002
- **CLI 测试**: 连接到 3001 (可通过参数更改)

## 故障排除

### 问题: 测试超时

**原因**: 服务器未运行或端口不正确

**解决方案**:
```bash
# 确保主服务器正在运行
npm start

# 或在 CLI 测试中指定正确的端口
npm run test:cli -- --port 3002
```

### 问题: 连接拒绝错误

**原因**: 可能是 CORS 配置问题

**解决方案**:
- 检查 `src/index.js` 中的 `allowedOrigins`
- 确保 localhost 在允许列表中

### 问题: 集成测试中的竞态条件

**原因**: 事件监听顺序问题

**解决方案**: 集成测试使用 Promise 来确保正确的事件顺序

## 性能指标

当前测试性能（示例）：

```
单元测试: ~200ms
集成测试: ~2-3s
CLI 测试: ~1-2s
```

## 扩展测试

### 添加新的单元测试

编辑 `tests/unit.test.js`:
```javascript
test('新功能测试', () => {
  // 测试代码
  expect(result).toBe(expected);
});
```

### 添加新的集成测试

编辑 `tests/integration.test.js`:
```javascript
test('新的通话场景', async () => {
  // 集成测试代码
});
```

## 相关文件

- [src/index.js](../src/index.js) - 主服务器文件
- [package.json](../package.json) - 项目依赖配置
- [jest.config.js](../jest.config.js) - Jest 配置

## 许可证

MIT
