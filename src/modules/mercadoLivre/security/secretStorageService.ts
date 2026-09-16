// src/modules/mercadoLivre/security/secretStorageService.ts
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCODING = 'hex';

const getEncryptionKey = (): Buffer => {
  const key = process.env.MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY deve ter pelo menos 32 caracteres no .env');
  }
  return Buffer.from(key.padEnd(32, '0').substring(0, 32), 'utf-8');
};

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', ENCODING);
  encrypted += cipher.final(ENCODING);
  
  const authTag = cipher.getAuthTag();
  return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted}`;
};

export const decrypt = (encryptedData: string): string => {
  const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Formato de dado criptografado inválido');
  }

  const iv = Buffer.from(ivHex, ENCODING);
  const authTag = Buffer.from(authTagHex, ENCODING);
  const encrypted = Buffer.from(encryptedHex, ENCODING);

  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);

  // CORREÇÃO TS: Trabalhar com Buffer até o final e converter para string apenas uma vez
  const decryptedBuffer = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return decryptedBuffer.toString('utf8');
};
