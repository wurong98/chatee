import React, { useState, useEffect, useRef } from 'react';
import { SignalClient } from '../utils/signal';
import { WebRTCManager } from '../utils/webrtc';
import { deriveKeyFromSeed } from '../utils/crypto';

function CallScreen({ callData, onCallEnd }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const signalClientRef = useRef(null);
  const webrtcManagerRef = useRef(null);
  const sharedKeyRef = useRef(null);

  useEffect(() => {
    initializeCall();

    return () => {
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      setStatus('initializing');

      // 推导共享密钥
      const key = deriveKeyFromSeed(callData.seed);
      sharedKeyRef.current = key;
      console.log('[CallScreen] 密钥已推导');

      // 初始化 WebRTC
      const webrtcManager = new WebRTCManager(
        (stream) => {
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        },
        (stream) => {
          setRemoteStream(stream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
        },
        (candidate) => {
          signalClientRef.current?.sendIceCandidate(candidate.toJSON());
        },
        (state) => {
          if (state === 'connected') {
            setStatus('connected');
          } else if (state === 'failed' || state === 'disconnected') {
            setStatus('disconnected');
          }
        }
      );

      await webrtcManager.initPeerConnection();
      webrtcManagerRef.current = webrtcManager;

      // 获取本地媒体
      await webrtcManager.getLocalStream();
      setStatus('media-ready');

      // 初始化信令客户端
      const signalClient = new SignalClient(
        async (offer) => {
          console.log('[Signal] 收到 offer');
          await webrtcManager.setRemoteDescription(offer);
          const answer = await webrtcManager.createAnswer();
          signalClient.sendAnswer(answer);
        },
        async (answer) => {
          console.log('[Signal] 收到 answer');
          await webrtcManager.setRemoteDescription(answer);
        },
        async (candidate) => {
          console.log('[Signal] 收到 ICE candidate');
          await webrtcManager.addIceCandidate(candidate);
        },
        () => {
          console.log('[Signal] 对方已加入');
          handleCalleeJoined();
        },
        () => {
          console.log('[Signal] 对方挂断');
          setStatus('hangup');
          handleEnd();
        },
        () => {
          console.log('[Signal] 对方断线');
          setStatus('disconnected');
          handleEnd();
        }
      );

      signalClientRef.current = signalClient;

      // 加入房间
      if (callData.isInitiator) {
        signalClient.callerJoin(callData.roomId, callData.seed);
        setStatus('waiting');
      } else {
        signalClient.calleeJoin(callData.roomId, callData.seed);
      }
    } catch (err) {
      setError(err.message);
      setStatus('error');
      console.error('初始化失败:', err);
    }
  };

  const handleCalleeJoined = async () => {
    try {
      if (callData.isInitiator) {
        console.log('[CallScreen] 创建 offer');
        const offer = await webrtcManagerRef.current.createOffer();
        signalClientRef.current.sendOffer(offer);
      }
    } catch (err) {
      setError(err.message);
      console.error('创建offer失败:', err);
    }
  };

  const handleEnd = () => {
    cleanup();
    setTimeout(onCallEnd, 1000);
  };

  const cleanup = () => {
    if (signalClientRef.current) {
      signalClientRef.current.hangup();
      signalClientRef.current.disconnect();
    }
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.close();
    }
  };

  const handleHangup = () => {
    handleEnd();
  };

  const getStatusText = () => {
    switch (status) {
      case 'initializing':
        return '初始化中...';
      case 'media-ready':
        return '媒体已就绪...';
      case 'waiting':
        return '等待对方加入...';
      case 'connected':
        return '通话中 🎵';
      case 'disconnected':
        return '连接已断开';
      case 'hangup':
        return '通话已结束';
      case 'error':
        return '错误';
      default:
        return '连接中...';
    }
  };

  return (
    <div className="video-container">
      {error && (
        <div className="status-message error" style={{ position: 'absolute', top: 20 }}>
          ⚠️ {error}
        </div>
      )}

      {status === 'connected' ? (
        <div className="video-display">
          <div className="video-box">
            <video ref={localVideoRef} autoPlay muted playsInline />
            <span className="video-label">你</span>
          </div>
          <div className="video-box">
            <video ref={remoteVideoRef} autoPlay playsInline />
            <span className="video-label">对方</span>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px'
            }}
          >
            🎥
          </div>
          <h2>{getStatusText()}</h2>
          {localStream && (
            <div style={{ marginTop: '20px' }}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: '200px',
                  height: '150px',
                  borderRadius: '8px',
                  background: '#000'
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="controls">
        <button className="control-button hangup" onClick={handleHangup}>
          📞
        </button>
      </div>
    </div>
  );
}

export default CallScreen;
