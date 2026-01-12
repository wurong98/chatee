import React, { useState } from 'react';
import { deriveKeyFromSeed } from '../utils/crypto';
import { SERVER_URL } from '../config';

function StartCall({ onStartCall, onGoToJoin }) {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState(null);
  const [error, setError] = useState(null);

  const handleStartCall = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${SERVER_URL}/api/call/generate`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('生成链接失败');
      }

      const data = await response.json();
      const { roomId, seed, link: fullLink } = data;

      // 推导共享密钥（验证）
      try {
        const sharedKey = deriveKeyFromSeed(seed);
        console.log('[StartCall] 已生成共享密钥');
      } catch (keyError) {
        console.error('[StartCall] 密钥推导错误:', keyError);
        throw new Error('密钥推导失败: ' + keyError.message);
      }

      setLink(fullLink);
      onStartCall({
        roomId,
        seed,
        isInitiator: true
      });
    } catch (err) {
      setError(err.message);
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (link) {
      navigator.clipboard.writeText(link).then(() => {
        alert('链接已复制');
      });
    }
  };

  return (
    <div className="container">
      <h1 className="title">🔐 端到端加密聊天</h1>
      <p className="subtitle">生成唯一链接，发送给对方开启加密通话</p>

      {error && <div className="status-message error">{error}</div>}

      {!link ? (
        <div>
          <button onClick={handleStartCall} disabled={loading}>
            {loading ? '生成中...' : '发起通话'}
          </button>
          <p style={{ margin: '20px 0', fontSize: '14px', color: '#666' }}>
            或者
            <button className="button-secondary" onClick={onGoToJoin} style={{ marginLeft: '10px' }}>
              加入通话
            </button>
          </p>
        </div>
      ) : (
        <div>
          <div className="status-message success">链接已生成！发送给对方</div>
          <div className="link-display">{link}</div>
          <button onClick={handleCopyLink}>📋 复制链接</button>
          <p style={{ marginTop: '20px', color: '#666', fontSize: '14px' }}>等待对方加入...</p>
        </div>
      )}
    </div>
  );
}

export default StartCall;
