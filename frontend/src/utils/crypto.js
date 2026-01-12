import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

/**
 * 从种子生成共享密钥
 * 使用简单的PBKDF2-like方案
 */
export function deriveKeyFromSeed(seed) {
  try {
    // 将URL-safe Base64种子转换为标准Base64
    let base64Seed = seed.replace(/-/g, '+').replace(/_/g, '/');
    
    // 添加padding
    while (base64Seed.length % 4) {
      base64Seed += '=';
    }
    
    // 将Base64种子解码为字节
    const seedBytes = decodeBase64(base64Seed);
    
    // 验证解码结果
    if (!seedBytes || seedBytes.length === 0) {
      throw new Error('种子解码失败');
    }
    
    // 使用SHA512(种子)生成32字节密钥
    // 注: TweetNaCl没有内置的KDF，这里使用secretbox的密钥推导方案
    const hash = nacl.hash(seedBytes);
    const key = hash.slice(0, 32); // 取前32字节作为加密密钥
    
    console.log('[crypto] 密钥推导成功');
    return key;
  } catch (e) {
    console.error('密钥推导失败:', e);
    throw new Error('无法从种子推导密钥');
  }
}

/**
 * 加密数据 (ChaCha20Poly1305 via NaCl secretbox)
 */
export function encryptData(message, key) {
  try {
    // 生成随机nonce
    const nonce = nacl.randomBytes(24);
    
    // 消息编码为字节
    const messageBytes = new TextEncoder().encode(message);
    
    // 使用secretbox加密
    const encrypted = nacl.secretbox(messageBytes, nonce, key);
    
    // 返回 nonce + ciphertext (都是Base64)
    return {
      nonce: encodeBase64(nonce),
      ciphertext: encodeBase64(encrypted)
    };
  } catch (e) {
    console.error('加密失败:', e);
    throw new Error('数据加密失败');
  }
}

/**
 * 解密数据
 */
export function decryptData(encrypted, key) {
  try {
    const nonce = decodeBase64(encrypted.nonce);
    const ciphertext = decodeBase64(encrypted.ciphertext);
    
    const decrypted = nacl.secretbox.open(ciphertext, nonce, key);
    if (!decrypted) {
      throw new Error('解密失败：密钥错误或数据被篡改');
    }
    
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('解密失败:', e);
    throw new Error('数据解密失败');
  }
}

/**
 * 生成公钥/私钥对 (用于签名或未来扩展)
 */
export function generateKeyPair() {
  const keyPair = nacl.sign.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey)
  };
}
