import { oauthStateService } from '../src/modules/mercadoLivre/auth/oauthStateService';

describe('OAuth State Service', () => {
  beforeEach(() => {
    oauthStateService.clearAll();
  });

  afterAll(() => {
    oauthStateService.clearAll();
  });

  it('deve gerar um state criptograficamente aleatório e válido', () => {
    const state = oauthStateService.generateState();
    expect(state).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(state)).toBe(true);
  });

  it('deve validar e consumir um state válido com sucesso', () => {
    const state = oauthStateService.generateState();
    const isValid = oauthStateService.validateAndConsumeState(state);
    expect(isValid).toBe(true);
  });

  it('deve rejeitar um state ausente ou vazio', () => {
    expect(oauthStateService.validateAndConsumeState('')).toBe(false);
    expect(oauthStateService.validateAndConsumeState(undefined as any)).toBe(false);
  });

  it('deve rejeitar um state inválido (não gerado pelo serviço)', () => {
    const isValid = oauthStateService.validateAndConsumeState('state-falso-aleatorio');
    expect(isValid).toBe(false);
  });

  it('deve rejeitar um state reutilizado (prevenção de replay attack)', () => {
    const state = oauthStateService.generateState();
    expect(oauthStateService.validateAndConsumeState(state)).toBe(true);
    expect(oauthStateService.validateAndConsumeState(state)).toBe(false);
  });

  it('deve rejeitar um state expirado', (done) => {
    const originalTTL = (oauthStateService as any).TTL_MS;
    (oauthStateService as any).TTL_MS = 50;
    
    const state = oauthStateService.generateState();
    
    setTimeout(() => {
      const isValid = oauthStateService.validateAndConsumeState(state);
      expect(isValid).toBe(false);
      (oauthStateService as any).TTL_MS = originalTTL;
      done();
    }, 100);
  });
});
