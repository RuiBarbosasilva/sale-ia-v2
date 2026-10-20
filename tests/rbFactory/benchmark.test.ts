import { selectBenchmarkModel, renderProspectDemo } from '../../src/services/rbFactoryTemplateEngine';
import { RB_BENCHMARK_CATALOG, RB_DEMO_COUNT } from '../../src/services/rbFactoryBenchmarkCatalog';
import { rbFactoryBenchmarkService } from '../../src/services/rbFactoryBenchmarkService';

describe('RB-Factory Sites - Benchmark Module', () => {
  
  describe('RB_BENCHMARK_CATALOG', () => {
    it('deve conter exatamente 10 nichos', () => {
      expect(RB_BENCHMARK_CATALOG).toHaveLength(10);
    });

    it('cada nicho deve ter exatamente 10 variantes', () => {
      RB_BENCHMARK_CATALOG.forEach(niche => {
        expect(niche.variants).toHaveLength(10);
        expect(niche.references).toHaveLength(10);
      });
    });

    it('deve totalizar 100 demos disponiveis', () => {
      expect(RB_DEMO_COUNT).toBe(100);
    });

    it('cada nicho deve ter estrutura completa', () => {
      RB_BENCHMARK_CATALOG.forEach(niche => {
        expect(niche.slug).toBeDefined();
        expect(niche.name).toBeDefined();
        expect(niche.description).toBeDefined();
        expect(niche.source).toBeDefined();
        expect(Array.isArray(niche.references)).toBe(true);
        expect(Array.isArray(niche.variants)).toBe(true);
      });
    });

    it('nichos criticos devem estar presentes', () => {
      const criticalSlugs = ['dentistas', 'restaurantes', 'imobiliarias', 'fitness', 'advocacia'];
      criticalSlugs.forEach(slug => {
        const found = RB_BENCHMARK_CATALOG.find(n => n.slug === slug);
        expect(found).toBeDefined();
      });
    });
  });

  describe('rbFactoryBenchmarkService', () => {
    it('catalog() deve retornar lista com contagem de variantes', () => {
      const catalog = rbFactoryBenchmarkService.catalog();
      expect(catalog).toHaveLength(10);
      catalog.forEach(item => {
        expect(item.count).toBe(10);
        expect(item.slug).toBeDefined();
        expect(item.name).toBeDefined();
      });
    });

    it('find() deve retornar nicho e variante corretos', () => {
      const result = rbFactoryBenchmarkService.find('dentistas', 5);
      expect(result.niche.slug).toBe('dentistas');
      expect(result.index).toBe(5);
      expect(result.variant).toBeDefined();
    });

    it('find() deve lancar erro para indice invalido', () => {
      expect(() => rbFactoryBenchmarkService.find('dentistas', 0)).toThrow('DEMO_NOT_FOUND');
      expect(() => rbFactoryBenchmarkService.find('dentistas', 11)).toThrow('DEMO_NOT_FOUND');
      expect(() => rbFactoryBenchmarkService.find('inexistente', 1)).toThrow('DEMO_NOT_FOUND');
    });

    it('render() deve gerar HTML valido', () => {
      const html = rbFactoryBenchmarkService.render('dentistas', 1);
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('<html');
      expect(html).toContain('RB FACTORY SITES');
    });
  });

  describe('selectBenchmarkModel', () => {
    it('deve inferir nicho dentistas a partir de keyword odontologia', () => {
      const result = selectBenchmarkModel('clinica com odontologia e implantes');
      expect(result.niche).toBe('dentistas');
      expect(result.index).toBeGreaterThanOrEqual(1);
      expect(result.index).toBeLessThanOrEqual(10);
    });

    it('deve inferir nicho restaurantes a partir de keywords gastronomicos', () => {
      const result = selectBenchmarkModel('restaurante italiano');
      expect(result.niche).toBe('restaurantes');
    });

    it('deve inferir nicho fitness a partir de keywords de academia', () => {
      const result = selectBenchmarkModel('academia de musculacao');
      expect(result.niche).toBe('fitness');
    });

    it('deve usar nicho padrao quando segmento e vazio', () => {
      const result = selectBenchmarkModel('');
      expect(result.niche).toBe('construcao');
    });

    it('deve respeitar nicho explicitamente solicitado', () => {
      const result = selectBenchmarkModel('qualquer coisa', 'fitness', 7);
      expect(result.niche).toBe('fitness');
      expect(result.index).toBe(7);
      expect(result.reason).toContain('explicitamente');
    });

    it('deve retornar indice 1 quando nao especificado', () => {
      const result = selectBenchmarkModel('dentista');
      expect(result.index).toBe(1);
    });

    it('deve conter referencia valida', () => {
      const result = selectBenchmarkModel('advocacia');
      expect(result.reference).toBeDefined();
      expect(typeof result.reference).toBe('string');
      expect(result.reference.length).toBeGreaterThan(0);
    });
  });

  describe('renderProspectDemo', () => {
    const baseInput = {
      companyName: 'Clinica Sorriso',
      segment: 'odontologia',
      city: 'Sao Paulo',
      phone: '11999998888'
    };

    it('deve gerar HTML completo com todos os elementos essenciais', () => {
      const { html, selection } = renderProspectDemo(baseInput);
      
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('<title>');
      expect(html).toContain(baseInput.companyName);
      expect(html).toContain(baseInput.city);
      expect(html).toContain('RB Factory Sites');
      expect(html).toContain('wa.me');
      
      expect(selection).toBeDefined();
      expect(selection.niche).toBe('dentistas');
    });

    it('deve gerar HTML com secoes obrigatorias em portugues', () => {
      const { html } = renderProspectDemo(baseInput);
      expect(html).toContain('SERVIÇOS');
      expect(html).toContain('CONFIANÇA');
      expect(html).toContain('CONTATO');
    });

    it('deve conter botao de WhatsApp quando telefone valido e fornecido', () => {
      const { html } = renderProspectDemo(baseInput);
      expect(html).toContain('https://wa.me/5511999998888');
    });

    it('deve lidar com telefone vazio', () => {
      const input = { ...baseInput, phone: '' };
      const { html } = renderProspectDemo(input);
      expect(html).toBeDefined();
      expect(html).toContain('href="#"');
    });

    it('deve usar nicho solicitado quando fornecido', () => {
      const input = { ...baseInput, niche: 'fitness' };
      const { selection } = renderProspectDemo(input);
      expect(selection.niche).toBe('fitness');
    });

    it('deve usar modelIndex solicitado quando valido', () => {
      const input = { ...baseInput, modelIndex: 5 };
      const { selection } = renderProspectDemo(input);
      expect(selection.index).toBe(5);
    });

    it('deve sanitizar caracteres especiais no companyName', () => {
      const input = { ...baseInput, companyName: '<script>alert("xss")</script>' };
      const { html } = renderProspectDemo(input);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('deve gerar HTMLs diferentes para nichos diferentes', () => {
      const input1 = { ...baseInput, niche: 'dentistas' };
      const input2 = { ...baseInput, niche: 'fitness' };
      const { html: html1 } = renderProspectDemo(input1);
      const { html: html2 } = renderProspectDemo(input2);
      expect(html1).not.toBe(html2);
    });
  });

  describe('Integracao e Qualidade', () => {
    it('todos os 100 demos devem ser renderizaveis sem erro', () => {
      RB_BENCHMARK_CATALOG.forEach(niche => {
        for (let i = 1; i <= 10; i++) {
          expect(() => {
            rbFactoryBenchmarkService.render(niche.slug, i);
          }).not.toThrow();
        }
      });
    });

    it('inferencia de nicho deve ser consistente para o mesmo input', () => {
      const segment = 'clinica veterinaria';
      const result1 = selectBenchmarkModel(segment);
      const result2 = selectBenchmarkModel(segment);
      expect(result1.niche).toBe(result2.niche);
    });
  });
});