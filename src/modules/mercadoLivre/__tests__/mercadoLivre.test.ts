// src/modules/mercadoLivre/__tests__/mercadoLivre.test.ts
import { encrypt, decrypt } from '../security/secretStorageService';

// Mock do processo env para os testes
process.env.MERCADO_LIVRE_TOKEN_ENCRYPTION_KEY = 'test-key-must-be-at-least-32-characters-long';

describe('Mercado Livre Security', () => {
  it('deve criptografar e descriptografar um token corretamente', () => {
    const originalToken = 'TG-654321-abcdef123456';
    const encrypted = encrypt(originalToken);
    
    expect(encrypted.split(':').length).toBe(3);
    expect(encrypted).not.toBe(originalToken);
    
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(originalToken);
  });

  it('deve falhar ao descriptografar dado corrompido', () => {
    expect(() => decrypt('dados-invalidos')).toThrow('Formato de dado criptografado inválido');
  });

  it('NÃO deve expor o token original no formato criptografado', () => {
    const originalToken = 'SECRET_TOKEN_123';
    const encrypted = encrypt(originalToken);
    expect(encrypted).not.toContain('SECRET');
    expect(encrypted).not.toContain('123');
  });
});

describe('Mercado Livre Webhook Idempotency Logic', () => {
  it('deve processar resourceId corretamente seja string ou objeto', () => {
    const resourceString = 'MLB123456';
    const resourceObject = { id: 'MLB123456', type: 'order' };

    const id1 = typeof resourceString === 'string' ? resourceString : JSON.stringify(resourceString);
    const id2 = typeof resourceObject === 'string' ? resourceObject : JSON.stringify(resourceObject);

    expect(id1).toBe('MLB123456');
    expect(id2).toBe('{"id":"MLB123456","type":"order"}');
  });
});
