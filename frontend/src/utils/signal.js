import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SIGNAL_SERVER || 'http://localhost:3001';

export class SignalClient {
  constructor(onOffer, onAnswer, onIceCandidate, onCalleeJoined, onHangup, onPeerDisconnected) {
    this.socket = io(SOCKET_URL);
    this.roomId = null;
    this.seed = null;

    // 设置事件监听
    this.socket.on('offer', (data) => onOffer && onOffer(data.offer));
    this.socket.on('answer', (data) => onAnswer && onAnswer(data.answer));
    this.socket.on('ice-candidate', (data) => onIceCandidate && onIceCandidate(data.candidate));
    this.socket.on('callee-joined', () => onCalleeJoined && onCalleeJoined());
    this.socket.on('hangup', () => onHangup && onHangup());
    this.socket.on('peer-disconnected', () => onPeerDisconnected && onPeerDisconnected());
    this.socket.on('error', (data) => console.error('Signal error:', data));
  }

  /**
   * 发起者加入房间
   */
  callerJoin(roomId, seed) {
    this.roomId = roomId;
    this.seed = seed;
    this.socket.emit('caller-join', { roomId, seed });
  }

  /**
   * 被呼叫者加入房间
   */
  calleeJoin(roomId, seed) {
    this.roomId = roomId;
    this.seed = seed;
    this.socket.emit('callee-join', { roomId, seed });
  }

  /**
   * 发送 offer
   */
  sendOffer(offer) {
    this.socket.emit('offer', {
      roomId: this.roomId,
      offer
    });
  }

  /**
   * 发送 answer
   */
  sendAnswer(answer) {
    this.socket.emit('answer', {
      roomId: this.roomId,
      answer
    });
  }

  /**
   * 发送 ICE 候选
   */
  sendIceCandidate(candidate) {
    this.socket.emit('ice-candidate', {
      roomId: this.roomId,
      candidate
    });
  }

  /**
   * 挂断通话
   */
  hangup() {
    this.socket.emit('hangup', { roomId: this.roomId });
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.socket.disconnect();
  }
}
