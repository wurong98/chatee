import React, { useState } from 'react';
import { deriveKeyFromSeed } from '../utils/crypto';

function JoinCall({ onJoinCall, onGoToStart }) {
  const [roomId, setRoomId] = useState('');
  const [seed, setSeed] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleJoinFromLink = () => {
    // 从URL中提取链接参数
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('roomId');
    const urlSeed = params.get('seed');

    if (urlRoomId && urlSeed) {
      setRoomId(urlRoomId);
      setSeed(urlSeed);
      handleJoinCall(urlRoomId, urlSeed);
    }
  };

  const handleJoinCall = async (id, s) => {
    setLoading(true);
    setError(null);

    try {
      if (!id || !s) {
        throw new Error('房间ID或种子缺失');
      }

      // 推导共享密钥
      try {
        const sharedKey = deriveKeyFromSeed(s);
        console.log('[JoinCall] 已推导共享密钥');
      } catch (keyError) {
        console.error('[JoinCall] 密钥推导错误:', keyError);
        throw new Error('密钥推导失败: ' + keyError.message);
      }

      onJoinCall({
        roomId: id,
        seed: s,
        isInitiator: false
      });
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasteLink = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const url = new URL(text);
      const id = url.searchParams.get('roomId');
      const s = url.searchParams.get('seed');

      if (id && s) {
        setRoomId(id);
        setSeed(s);
      } else {
        setError('链接格式不正确');
      }
    } catch (err) {
      setError('无法访问剪贴板');
    }
  };

  React.useEffect(() => {
    handleJoinFromLink();
  }, []);

  return (
    <div className="container">
      <h1 className="title">🔐 加入通话</h1>
      <p className="subtitle">输入对方发送的链接或参数</p>

      {error && <div className="status-message error">{error}</div>}

      <div>
        <input
          type="text"
          placeholder="房间 ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <input
          type="text"
          placeholder="种子 (Seed)"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
        />

        <button
          onClick={() => handleJoinCall(roomId, seed)}
          disabled={loading || !roomId || !seed}
        >
          {loading ? '加入中...' : '加入通话'}
        </button>

        <button className="button-secondary" onClick={handlePasteLink}>
          📋 粘贴链接
        </button>
      </div>

      <button className="button-secondary" onClick={onGoToStart} style={{ marginTop: '20px' }}>
        返回首页
      </button>
    </div>
  );
}

export default JoinCall;
