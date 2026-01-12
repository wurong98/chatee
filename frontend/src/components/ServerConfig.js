import React, { useState } from 'react';
import { getStoredConfig, saveConfig, clearConfig, SERVER_HOST, SERVER_PORT, SERVER_URL } from '../config';
import '../styles/ServerConfig.css';

function ServerConfig({ onConfigSaved }) {
  const [host, setHost] = useState(SERVER_HOST);
  const [port, setPort] = useState(SERVER_PORT);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    if (!host || !port) {
      setMessage('❌ 地址和端口不能为空');
      return;
    }

    if (isNaN(port) || port < 1 || port > 65535) {
      setMessage('❌ 端口号必须在 1-65535 之间');
      return;
    }

    const success = saveConfig(host, parseInt(port, 10));
    if (success) {
      setMessage('✅ 配置已保存，请刷新页面生效');
      setIsEditing(false);
      onConfigSaved && onConfigSaved();
    } else {
      setMessage('❌ 配置保存失败');
    }
  };

  const handleReset = () => {
    clearConfig();
    setHost('localhost');
    setPort(3001);
    setMessage('✅ 已恢复默认配置，请刷新页面生效');
    setIsEditing(false);
  };

  const handleCancel = () => {
    setHost(SERVER_HOST);
    setPort(SERVER_PORT);
    setMessage('');
    setIsEditing(false);
  };

  return (
    <div className="server-config">
      <div className="config-header">
        <h3>服务器配置</h3>
        <button
          className="toggle-btn"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? '关闭' : '编辑'}
        </button>
      </div>

      {!isEditing ? (
        <div className="config-display">
          <div className="config-item">
            <span className="label">当前地址:</span>
            <span className="value">{SERVER_URL}</span>
          </div>
        </div>
      ) : (
        <div className="config-form">
          <div className="form-group">
            <label>服务器地址:</label>
            <input
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="如: localhost 或 192.168.1.100"
            />
          </div>

          <div className="form-group">
            <label>服务器端口:</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              min="1"
              max="65535"
              placeholder="如: 3001"
            />
          </div>

          <div className="config-preview">
            <span className="label">预览:</span>
            <span className="value">http://{host}:{port}</span>
          </div>

          {message && (
            <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <div className="button-group">
            <button className="btn btn-primary" onClick={handleSave}>
              保存配置
            </button>
            <button className="btn btn-secondary" onClick={handleReset}>
              恢复默认
            </button>
            <button className="btn btn-cancel" onClick={handleCancel}>
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServerConfig;
