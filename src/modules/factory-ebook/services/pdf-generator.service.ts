import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';

type EbookImage = string | { filePath?: string };

type EbookConfig = {
  titulo: string;
  subtitulo?: string;
  autor?: string;
  tema?: string;
  tamanho?: '8.5x11' | '6x9' | '8x10';
  numeroPaginas?: number;
  capaDura?: boolean;
  imagens?: EbookImage[];
  promptsImagem?: string[];
  coverPath?: string;
};

export class PDFGeneratorService {
  async gerarLivroColorir(config: EbookConfig) {
    try {
      const baseDir = path.resolve(process.cwd(), 'output', 'factory-ebook');
      if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

      const titulo = typeof config.titulo === 'string' ? config.titulo.trim().slice(0, 200) : '';
      if (!titulo) return { sucesso: false, erro: 'Título do livro é obrigatório' };

      const safeName = titulo.normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase().slice(0, 100) || 'ebook';
      const fileName = safeName + '_' + Date.now().toString(36);
      const pdfPath = path.join(baseDir, fileName + '.pdf');
      const metadataPath = path.join(baseDir, fileName + '_metadata.json');

      const tamanhos: Record<NonNullable<EbookConfig['tamanho']>, [number, number]> = {
        '8.5x11': [612, 792],
        '6x9': [432, 648],
        '8x10': [576, 720]
      };
      const tamanho = config.tamanho && config.tamanho in tamanhos ? config.tamanho : '8.5x11';
      const [width, height] = tamanhos[tamanho];

      const autor = typeof config.autor === 'string' ? config.autor.trim().slice(0, 120) || 'RB Factory' : 'RB Factory';
      const tema = typeof config.tema === 'string' ? config.tema.trim().slice(0, 120) : '';
      const numRaw = Number(config.numeroPaginas);
      const numPaginas = Math.max(1, Math.min(200, Number.isFinite(numRaw) ? Math.floor(numRaw) : 10));
      const imagens = Array.isArray(config.imagens) ? config.imagens.slice(0, numPaginas) : [];
      const prompts = Array.isArray(config.promptsImagem)
        ? config.promptsImagem.slice(0, numPaginas).map(p => typeof p === 'string' ? p.slice(0, 2000) : '')
        : [];

      const doc = new PDFDocument({
        size: [width, height],
        margins: { top: 36, bottom: 36, left: 36, right: 36 },
        info: { Title: titulo, Author: autor }
      });

      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      doc.fontSize(14).text('Este livro pertence a:', { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(24).text('_________________________________', { align: 'center' });

      for (let i = 1; i <= numPaginas; i++) {
        doc.addPage();
        const rawImage = imagens[i - 1];
        const imagePath = typeof rawImage === 'string'
          ? path.resolve(process.cwd(), rawImage)
          : rawImage?.filePath ? path.resolve(process.cwd(), rawImage.filePath) : null;

        if (imagePath && fs.existsSync(imagePath)) {
          doc.image(imagePath, 54, 54, { fit: [width - 108, height - 108], align: 'center', valign: 'center' });
        } else {
          doc.rect(72, 72, width - 144, height - 144).stroke('#cccccc');
          doc.fontSize(16).fillColor('#777777').text('Página de colorir ' + i, { align: 'center' });
          doc.moveDown();
          doc.fontSize(10).fillColor('#444444').text(prompts[i - 1] || tema, { align: 'center', width: width - 120 });
        }
        doc.fontSize(8).fillColor('#666666').text(String(i), 0, height - 30, { align: 'center', width });
      }

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          const metadata = {
            titulo,
            subtitulo: typeof config.subtitulo === 'string' ? config.subtitulo.slice(0, 300) : '',
            autor,
            tema,
            paginas: numPaginas + 2,
            tamanho,
            capa: config.capaDura ? 'Capa Dura' : 'Capa Mole',
            precoSugerido: config.capaDura ? 'US$ 12.99' : 'US$ 7.99',
            arquivoPDF: pdfPath,
            promptsImagem: prompts,
            checklist: [
              'PDF gerado pelo pipeline',
              imagens.length >= numPaginas ? 'Todas as páginas receberam imagens geradas' : 'Algumas páginas ainda usam briefing/prompts',
              config.coverPath ? 'Capa fornecida pelo pipeline' : 'Capa ainda não fornecida',
              'Publicação KDP requer credenciais e confirmação de publicação'
            ],
            status: imagens.length >= numPaginas && Boolean(config.coverPath) ? 'READY_FOR_REVIEW' : 'REVIEW_REQUIRED'
          };
          fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
          resolve({ sucesso: true, pdfPath, metadataPath, metadata });
        });
        stream.on('error', () => reject({ sucesso: false, erro: 'FACTORY_EBOOK_PDF_STREAM_FAILED' }));
      });
    } catch (error: unknown) {
      console.error('[PDFGenerator] Error:', error instanceof Error ? error.message : 'UNKNOWN_ERROR');
      return { sucesso: false, erro: 'FACTORY_EBOOK_PDF_FAILED' };
    }
  }

  async listarLivrosGerados() {
    const baseDir = path.resolve(process.cwd(), 'output', 'factory-ebook');
    if (!fs.existsSync(baseDir)) return [];
    const arquivos = fs.readdirSync(baseDir).filter(f => f.endsWith('_metadata.json')).slice(0, 500);
    const livros: unknown[] = [];
    for (const arquivo of arquivos) {
      try {
        livros.push(JSON.parse(fs.readFileSync(path.join(baseDir, arquivo), 'utf-8')) as unknown);
      } catch (error: unknown) {
        console.warn(`[PDFGenerator] Metadata ignorada (${arquivo}): ${error instanceof Error ? error.message : 'JSON_INVALID'}`);
      }
    }
    return livros;
  }
}
