// src/modules/mercadoLivre/auth/oauthStateService.ts
import crypto from 'crypto';

interface StateRecord {
  expiresAt: number;
  used: boolean;
}

class OAuthStateService {
  private states = new Map<string, StateRecord>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutos de validade
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Limpeza automática de estados expirados a cada 1 minuto
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }

  generateState(): string {
    const state = crypto.randomBytes(32).toString('hex');
    this.states.set(state, {
      expiresAt: Date.now() + this.TTL_MS,
      used: false,
    });
    return state;
  }

  validateAndConsumeState(state: string): boolean {
    const record = this.states.get(state);

    // 1. State não existe
    if (!record) {
      return false;
    }

    // 2. State expirado
    if (Date.now() > record.expiresAt) {
      this.states.delete(state);
      return false;
    }

    // 3. State já foi utilizado (replay attack prevention)
    if (record.used) {
      this.states.delete(state);
      return false;
    }

    // 4. Validação bem-sucedida: marcar como usado e remover
    record.used = true;
    this.states.delete(state); // Remoção imediata após uso (single-use)
    return true;
  }

  private cleanup() {
    const now = Date.now();
    for (const [state, record] of this.states.entries()) {
      if (now > record.expiresAt || record.used) {
        this.states.delete(state);
      }
    }
  }

  // Método para testes ou shutdown gracioso
  clearAll() {
    this.states.clear();
  }
}

export const oauthStateService = new OAuthStateService();
