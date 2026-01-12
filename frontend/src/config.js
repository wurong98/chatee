/**
 * 应用配置文件
 * 服务器地址和端口设置
 */

const DEFAULT_HOST = '43.155.147.156';
const DEFAULT_PORT = 3001;
const STORAGE_KEY = 'server_config';

/**
 * 从 localStorage 获取配置
 */
export function getStoredConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to read config from localStorage:', error);
  }
  return null;
}

/**
 * 保存配置到 localStorage
 */
export function saveConfig(host, port) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ host, port }));
    return true;
  } catch (error) {
    console.error('Failed to save config to localStorage:', error);
    return false;
  }
}

/**
 * 清除 localStorage 中的配置
 */
export function clearConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear config from localStorage:', error);
    return false;
  }
}

/**
 * 获取当前配置（优先级：localStorage > 环境变量 > 默认值）
 */
function getCurrentConfig() {
  const storedConfig = getStoredConfig();
  
  if (storedConfig && storedConfig.host && storedConfig.port) {
    return {
      host: storedConfig.host,
      port: storedConfig.port
    };
  }

  return {
    host: process.env.REACT_APP_SERVER_HOST || DEFAULT_HOST,
    port: parseInt(process.env.REACT_APP_SERVER_PORT || DEFAULT_PORT, 10)
  };
}

const config = getCurrentConfig();

export const SERVER_HOST = config.host;
export const SERVER_PORT = config.port;

export const SERVER_URL = `https://${SERVER_HOST}:${SERVER_PORT}`;
export const SIGNAL_SERVER_URL = process.env.REACT_APP_SIGNAL_SERVER || SERVER_URL;

export default {
  SERVER_HOST,
  SERVER_PORT,
  SERVER_URL,
  SIGNAL_SERVER_URL,
  getStoredConfig,
  saveConfig,
  clearConfig
};
