import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';

export class PDFGeneratorService {
  async gerarLivroColorir(config: any) {
    try {
      const baseDir = path.resolve(process.cwd(), 'output', 'factory-ebook');
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      const safeName = config.titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = safeName + '_' + Date.now();
      const pdfPath = path.join(baseDir, fileName + '.pdf');
      const metadataPath = path.join(baseDir, fileName + '_metadata.json');

      const tamanhos: any = { '8.5x11': [612, 792], '6x9': [432, 648], '8x10': [576, 720] };
      const [width, height] = tamanhos[config.tamanho] || tamanhos['8.5x11'];

      // Agora o PDFDocument vai funcionar corretamente como construtor
      const doc = new PDFDocument({ 
        size: [width, height], 
        margins: { top: 36, bottom: 36, left: 36, right: 36 },
        info: { Title: config.titulo, Author: config.autor || 'RB Factory' }
      });

      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Capa interna
      doc.fontSize(14).text('Este livro pertence a:', { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(24).text('_________________________________', { align: 'center' });
      
      // Paginas de desenho: usa imagens reais quando fornecidas pelo pipeline.
      const numPaginas = Math.max(1, Math.min(500, Number(config.numeroPaginas) || 10));
      const imagens = Array.isArray(config.imagens) ? config.imagens : [];
      const prompts = Array.isArray(config.promptsImagem) ? config.promptsImagem : [];
      for (let i = 1; i <= numPaginas; i++) {
        doc.addPage();
        const rawImage = imagens[i - 1];
        const imagePath = typeof rawImage === 'string'
          ? path.resolve(process.cwd(), rawImage)
          : rawImage?.filePath ? path.resolve(process.cwd(), rawImage.filePath) : null;
        if (imagePath && fs.existsSync(imagePath)) {
          doc.image(imagePath, 54, 54, {
            fit: [width - 108, height - 108],
            align: 'center',
            valign: 'center'
          });
        } else {
          doc.rect(72, 72, width - 144, height - 144).stroke('#cccccc');
          doc.fontSize(16).fillColor('#777777').text('Página de colorir ' + i, { align: 'center' });
          doc.moveDown();
          doc.fontSize(10).fillColor('#444444').text(
            prompts[i - 1] || config.tema,
            { align: 'center', width: width - 120 }
          );
        }
        doc.fontSize(8).fillColor('#666666').text(String(i), 0, height - 30, { align: 'center', width });
      }

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          const metadata = {
            titulo: config.titulo,
            subtitulo: config.subtitulo || '',
            autor: config.autor || 'RB Factory',
            tema: config.tema,
            paginas: numPaginas + 2,
            tamanho: config.tamanho || '8.5x11',
            capa: config.capaDura ? 'Capa Dura' : 'Capa Mole',
            precoSugerido: config.capaDura ? 'US$ 12.99' : 'US$ 7.99',
            arquivoPDF: pdfPath,
            promptsImagem: config.promptsImagem || [],
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
        stream.on('error', (err) => reject({ sucesso: false, erro: 'Erro no stream do PDF: ' + err.message }));
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao gerar PDF';
      console.error('[PDFGenerator] ERRO CRITICO:', message);
      return { sucesso: false, erro: message };
    }
  }

  async listarLivrosGerados() {
    const baseDir = path.resolve(process.cwd(), 'output', 'factory-ebook');
    if (!fs.existsSync(baseDir)) return [];
    return fs.readdirSync(baseDir).filter(f => f.endsWith('_metadata.json')).map(f => {
      return JSON.parse(fs.readFileSync(path.join(baseDir, f), 'utf-8'));
    });
  }
}
