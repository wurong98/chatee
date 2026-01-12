#!/usr/bin/env node

/**
 * CLI 工具 - 测试完整的通话流程
 * 使用方法:
 *   npm run test:cli                    # 测试默认端口 3001
 *   npm run test:cli -- --port 3002     # 测试指定端口
 *   npm run test:cli -- --help          # 查看帮助
 */

const ioClient = require('socket.io-client');
const axios = require('axios');
const chalk = require('chalk');

// 解析命令行参数
const args = process.argv.slice(2);
let host = 'localhost';
let port = 3001;
let url = null;
let help = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && args[i + 1]) {
    url = args[i + 1];
    i++;
  } else if (args[i] === '--host' && args[i + 1]) {
    host = args[i + 1];
    i++;
  } else if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--help') {
    help = true;
  }
}

if (help) {
  console.log(`
CLI 通话测试工具
===============

用法:
  npm run test:cli                                    # 使用默认设置 (localhost:3001)
  npm run test:cli -- --port 3002                    # 指定端口
  npm run test:cli -- --host 192.168.1.100           # 指定主机
  npm run test:cli -- --host 192.168.1.100 --port 3002  # 指定主机和端口
  npm run test:cli -- --url http://example.com:3001  # 指定完整 URL
  npm run test:cli -- --help                         # 显示帮助信息

参数说明:
  --url <url>           完整的服务器 URL (例: http://192.168.1.100:3001)
  --host <host>         服务器主机地址 (默认: localhost)
  --port <port>         服务器端口 (默认: 3001)
  --help                显示帮助信息

优先级: --url > (--host + --port)
如果指定了 --url，--host 和 --port 会被忽略

示例:
  # 本地测试
  npm run test:cli

  # 测试远程服务器
  npm run test:cli -- --url http://example.com:3001

  # 测试局域网地址
  npm run test:cli -- --host 192.168.1.100 --port 3001

此工具模拟完整的通话流程:
  1. 调用 API 生成新链接
  2. 启动 Caller 连接
  3. 启动 Callee 连接
  4. 交换 WebRTC offer/answer
  5. 交换 ICE candidates
  6. 传输文本数据 (模拟加密文本传输)
  7. 模拟挂断

特性:
  - 不传输视频/音频，仅处理信令
  - 支持加密文本传输
  - 完整的错误处理
  - 详细的日志输出
  `);
  process.exit(0);
}

const SERVER_URL = url || `http://${host}:${port}`;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// 颜色化输出
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  step: (msg) => console.log(chalk.cyan('→'), chalk.bold(msg)),
  data: (msg) => console.log(chalk.gray('  '), msg)
};

// 重试机制
async function withRetry(fn, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      log.warn(`重试 ${i + 1}/${retries - 1}...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

// 连接客户端
function connectClient(clientName) {
  return new Promise((resolve, reject) => {
    const socket = ioClient(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 100,
      reconnectionDelayMax: 500
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`${clientName} 连接超时`));
    }, 5000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      resolve(socket);
    });

    socket.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`${clientName} 连接错误: ${error}`));
    });

    socket.on('connect_error', (error) => {
      if (socket.connected) return;
      clearTimeout(timeout);
      reject(new Error(`${clientName} 连接错误: ${error}`));
    });
  });
}

// 等待事件
function waitForEvent(socket, eventName, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`等待事件 "${eventName}" 超时`));
    }, timeout);

    socket.once(eventName, (data) => {
      clearTimeout(timeoutId);
      resolve(data);
    });
  });
}

// 主测试函数
async function runTest() {
  console.log('\n' + chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.bold.cyan('    WebRTC 信令服务器 - 完整通话流程测试'));
  console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  log.info(`服务器地址: ${SERVER_URL}`);
  log.info(`测试开始时间: ${new Date().toLocaleString()}\n`);

  let callerSocket, calleeSocket;
  let roomId, seed;

  try {
    // 第一步: 生成通话链接
    log.step('第一步: 生成通话链接');
    const { data } = await withRetry(async () => {
      return axios.post(`${SERVER_URL}/api/call/generate`);
    });
    ({ roomId, seed, link: generatedLink } = data);
    log.success(`链接生成成功`);
    log.data(`Room ID: ${roomId}`);
    log.data(`Seed: ${seed.substring(0, 20)}...`);
    log.data(`Link: ${generatedLink}\n`);

    // 第二步: Caller 连接
    log.step('第二步: Caller 连接并加入房间');
    callerSocket = await connectClient('Caller');
    log.success('Caller 已连接');

    const callerReadyPromise = waitForEvent(callerSocket, 'caller-ready');
    callerSocket.emit('caller-join', { roomId, seed });
    await callerReadyPromise;
    log.success('Caller 已加入房间\n');

    // 第三步: Callee 连接
    log.step('第三步: Callee 连接并加入房间');
    calleeSocket = await connectClient('Callee');
    log.success('Callee 已连接');

    const calleeReadyPromise = waitForEvent(calleeSocket, 'callee-ready');
    const calleeJoinedPromise = waitForEvent(callerSocket, 'callee-joined');

    calleeSocket.emit('callee-join', { roomId });
    await Promise.all([calleeReadyPromise, calleeJoinedPromise]);
    log.success('Callee 已加入房间');
    log.success('Caller 已收到 Callee 加入通知\n');

    // 第四步: 交换 WebRTC Offer/Answer
    log.step('第四步: 交换 WebRTC offer/answer (SDP)');
    
    const mockOffer = {
      type: 'offer',
      sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n'
    };
    log.data(`Caller 发送 Offer (模拟 SDP)...`);
    const offerPromise = waitForEvent(calleeSocket, 'offer');
    callerSocket.emit('offer', { roomId, offer: mockOffer });
    const receivedOffer = await offerPromise;
    log.success('Callee 已收到 Offer');
    
    const mockAnswer = {
      type: 'answer',
      sdp: 'v=0\r\no=- 654321 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n'
    };
    log.data(`Callee 发送 Answer (模拟 SDP)...`);
    const answerPromise = waitForEvent(callerSocket, 'answer');
    calleeSocket.emit('answer', { roomId, answer: mockAnswer });
    const receivedAnswer = await answerPromise;
    log.success('Caller 已收到 Answer\n');

    // 第五步: 交换 ICE Candidates
    log.step('第五步: 交换 ICE Candidates');
    
    const mockCandidate1 = {
      candidate: 'candidate:1 1 udp 2130706431 127.0.0.1 54321 typ host',
      sdpMid: 'video',
      sdpMLineIndex: 0
    };
    log.data(`Caller 发送 ICE Candidate...`);
    const ice1Promise = waitForEvent(calleeSocket, 'ice-candidate');
    callerSocket.emit('ice-candidate', { roomId, candidate: mockCandidate1 });
    await ice1Promise;
    log.success('Callee 已收到 ICE Candidate');

    const mockCandidate2 = {
      candidate: 'candidate:2 1 udp 2130706431 192.168.1.100 54322 typ host',
      sdpMid: 'video',
      sdpMLineIndex: 0
    };
    log.data(`Callee 发送 ICE Candidate...`);
    const ice2Promise = waitForEvent(callerSocket, 'ice-candidate');
    calleeSocket.emit('ice-candidate', { roomId, candidate: mockCandidate2 });
    await ice2Promise;
    log.success('Caller 已收到 ICE Candidate\n');

    // 第六步: 传输文本消息 (加密文本)
    log.step('第六步: 传输加密文本消息');
    
    const encryptedMessages = [
      { text: 'Hello from Caller!', encrypted: true },
      { text: 'Hi Caller, I received your message!', encrypted: true },
      { text: '👋 This is end-to-end encrypted!', encrypted: true }
    ];

    // Caller 发送消息
    for (let i = 0; i < 2; i++) {
      const msg = encryptedMessages[i];
      log.data(`Caller 发送: "${msg.text}"`);
      const msgPromise = waitForEvent(calleeSocket, 'text-message');
      callerSocket.emit('text-message', { roomId, message: msg });
      const received = await msgPromise;
      log.success(`Callee 已接收消息`);
    }

    // Callee 回复消息
    const msg = encryptedMessages[2];
    log.data(`Callee 发送: "${msg.text}"`);
    const msgPromise = waitForEvent(callerSocket, 'text-message');
    calleeSocket.emit('text-message', { roomId, message: msg });
    const received = await msgPromise;
    log.success(`Caller 已接收消息\n`);

    // 第七步: 挂断通话
    log.step('第七步: 挂断通话');
    
    const hangupPromise = waitForEvent(calleeSocket, 'hangup');
    log.data('Caller 发送挂断信号...');
    callerSocket.emit('hangup', { roomId });
    await hangupPromise;
    log.success('Callee 已收到挂断信号');
    
    // 清理连接
    callerSocket.disconnect();
    calleeSocket.disconnect();
    log.success('两端已断开连接\n');

    // 测试完成
    console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.green.bold('✓ 测试全部通过!'));
    console.log(chalk.cyan('完整的通话流程已验证:'));
    console.log(chalk.cyan('  ✓ 链接生成'));
    console.log(chalk.cyan('  ✓ Caller/Callee 加入'));
    console.log(chalk.cyan('  ✓ Offer/Answer 交换'));
    console.log(chalk.cyan('  ✓ ICE Candidates 交换'));
    console.log(chalk.cyan('  ✓ 文本消息传输'));
    console.log(chalk.cyan('  ✓ 通话挂断'));
    console.log(chalk.bold.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    process.exit(0);

  } catch (error) {
    log.error(`测试失败: ${error.message}`);
    console.error(chalk.red('错误详情:'), error.stack);

    // 清理连接
    if (callerSocket) callerSocket.disconnect();
    if (calleeSocket) calleeSocket.disconnect();

    process.exit(1);
  }
}

// 运行测试
runTest();
