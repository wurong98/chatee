/**
 * WebRTC 管理类
 */
export class WebRTCManager {
  constructor(onLocalStream, onRemoteStream, onIceCandidate, onConnectionStateChange) {
    this.peerConnection = null;
    this.localStream = null;
    this.onLocalStream = onLocalStream;
    this.onRemoteStream = onRemoteStream;
    this.onIceCandidate = onIceCandidate;
    this.onConnectionStateChange = onConnectionStateChange;
  }

  /**
   * 初始化 PeerConnection
   */
  async initPeerConnection(iceServers = []) {
    const config = {
      iceServers: iceServers.length > 0 ? iceServers : [{ urls: ['stun:stun.l.google.com:19302'] }]
    };

    this.peerConnection = new RTCPeerConnection(config);

    // ICE 候选事件
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidate && this.onIceCandidate(event.candidate);
      }
    };

    // 远程流事件
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] 收到远程媒体流');
      this.onRemoteStream && this.onRemoteStream(event.streams[0]);
    };

    // 连接状态变化
    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] 连接状态:', this.peerConnection.connectionState);
      this.onConnectionStateChange && this.onConnectionStateChange(this.peerConnection.connectionState);
    };
  }

  /**
   * 获取本地媒体流
   */
  async getLocalStream(constraints = { audio: true, video: true }) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[WebRTC] 获取本地媒体成功');

      // 添加本地流轨道到PeerConnection
      if (this.peerConnection) {
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      this.onLocalStream && this.onLocalStream(this.localStream);
      return this.localStream;
    } catch (e) {
      console.error('[WebRTC] 获取媒体失败:', e);
      throw new Error('无法获取摄像头/麦克风，请检查权限');
    }
  }

  /**
   * 创建 offer
   */
  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await this.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (e) {
      console.error('[WebRTC] 创建offer失败:', e);
      throw e;
    }
  }

  /**
   * 创建 answer
   */
  async createAnswer() {
    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      return answer;
    } catch (e) {
      console.error('[WebRTC] 创建answer失败:', e);
      throw e;
    }
  }

  /**
   * 设置远程描述 (offer/answer)
   */
  async setRemoteDescription(description) {
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
      console.log('[WebRTC] 设置远程描述成功');
    } catch (e) {
      console.error('[WebRTC] 设置远程描述失败:', e);
      throw e;
    }
  }

  /**
   * 添加 ICE 候选
   */
  async addIceCandidate(candidate) {
    try {
      if (candidate) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (e) {
      console.error('[WebRTC] 添加ICE候选失败:', e);
    }
  }

  /**
   * 关闭连接
   */
  close() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}
