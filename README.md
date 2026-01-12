# Chat-EE: 端到端加密1对1聊天应用

## 项目结构

```
chat-ee/
├── backend/              # Node.js 信令服务器
│   ├── src/
│   │   └── index.js     # 信令服务器（WebSocket 中继）
│   └── package.json
├── frontend/            # React 前端应用
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── utils/
│   │   │   ├── crypto.js      # 加密工具（TweetNaCl）
│   │   │   ├── signal.js      # 信令客户端（Socket.io）
│   │   │   └── webrtc.js      # WebRTC 管理
│   │   ├── components/
│   │   │   ├── StartCall.js   # 发起通话页面
│   │   │   ├── JoinCall.js    # 加入通话页面
│   │   │   └── CallScreen.js  # 通话界面
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
└── plan.md              # 本规划文档
```

## 运行说明

### 后端启动

```bash
cd backend
npm install
npm run dev
```

后端将在 `http://localhost:3001` 启动。

### 前端启动

在另一个终端：

```bash
cd frontend
npm install
npm start
```

前端将在 `http://localhost:3000` 启动。

## 技术架构

### 后端（信令服务器）

- **Express + WebSocket (Socket.io)**：处理实时信令转发
- **无脑中继模式**：服务器仅转发 WebRTC offer/answer/ICE 候选，完全不处理加密数据
- **房间管理**：通过 UUID 房间ID管理发起者和接收者的配对

### 前端（React 应用）

- **WebRTC**：处理音视频采集和媒体流
- **TweetNaCl.js**：端到端加密（NaCl 库的 JS 实现）
- **Socket.io**：WebSocket 客户端，连接到信令服务器

### 加密方案

1. **密钥推导**：
   - 链接中包含随机种子（seed）
   - 接收者通过种子使用 SHA512 推导相同的对称密钥
   - 无需从服务器获取密钥

2. **数据加密**：
   - 使用 NaCl secretbox（ChaCha20Poly1305）加密
   - 每条消息包含随机 nonce（24 字节）和密文

3. **关键点**：
   - 私钥不对则无法解密
   - 服务器转发的所有负载均为密文
   - 两端通过链接中的种子生成相同的对称密钥

## 工作流程

### 发起通话

1. 用户点击"发起通话"
2. 前端请求后端生成唯一链接（包含 roomId 和 seed）
3. 前端推导共享密钥
4. 生成链接显示在页面，用户复制并发送给对方

### 接收通话

1. 用户点击链接或手动输入参数
2. 前端使用相同的 seed 推导共享密钥
3. 通过 WebSocket 加入房间

### 建立连接

1. 双方都加入房间后，信令服务器通知发起者
2. 发起者创建 WebRTC offer，通过信令服务器中继给接收者
3. 接收者创建 answer 回复
4. 双方交换 ICE 候选
5. P2P 连接建立，音视频通过 RTC DataChannel 传输（可加密）

## 当前实现状态

### ✅ 已完成

- [x] 后端信令服务器（Express + Socket.io）
- [x] 链接生成与房间管理
- [x] WebRTC offer/answer/ICE 中继
- [x] 前端 UI（StartCall, JoinCall, CallScreen）
- [x] 密钥推导工具（TweetNaCl）
- [x] WebRTC 媒体采集和连接管理
- [x] Socket.io 信令客户端

### ⏳ 下一步

- [ ] 测试全流程连通性
- [ ] 数据加密集成（在 DataChannel 上应用加密）
- [ ] 错误处理和异常恢复
- [ ] 跨浏览器兼容性测试
- [ ] UI/UX 优化
- [ ] 部署配置（HTTPS/WSS）

## 安全考虑

1. **无状态中继**：服务器不保存任何加密数据
2. **密钥不泄露**：密钥在链接中只有一次，之后通过本地推导
3. **链接有效期**：建议链接生成后 5 分钟内使用
4. **防重放**：同一链接仅允许一对一连接
5. **HTTPS/WSS**：生产环境必须使用安全传输

## 注意事项

- 浏览器需要支持 WebRTC（Chrome, Firefox, Safari, Edge）
- 需要用户授予摄像头和麦克风权限
- 音视频采集可能需要 HTTPS（部分浏览器）
- 防火墙需要允许 WebRTC 流量
