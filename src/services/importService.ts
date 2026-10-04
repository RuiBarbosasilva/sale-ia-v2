import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

export interface ImportResult {
  total: number;
  imported: number;
  duplicatesInFile: string[]; // Nã£Â£ã†â€™ã£â€šã‚Âºmeros que se repetem no prã£Â£ã†â€™ã£â€šã‚Â³prio CSV
  duplicatesInDb: string[];   // Nã£Â£ã†â€™ã£â€šã‚Âºmeros que jã£Â£ã†â€™ã£â€šã‚Â¡ existem no banco
  updated: number;
  invalid: number;
  errors: string[];
}

export async function importLeadsFromCSV(filePath: string): Promise<ImportResult> {
  const result: ImportResult = {
    total: 0,
    imported: 0,
    duplicatesInFile: [],
    duplicatesInDb: [],
    updated: 0,
    invalid: 0,
    errors: []
  };

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('Arquivo CSV vazio ou sem cabeã£Â£ã†â€™ã£â€šã‚Â§alho');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    result.total = lines.length - 1;

    // Mapa para detectar duplicatas dentro do prã£Â£ã†â€™ã£â€šã‚Â³prio arquivo
    const phonesInFile = new Map<string, number>();

    // Primeira passada: identificar duplicatas no arquivo
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      if (row.phone) {
        const cleanPhone = row.phone.replace(/\D/g, '');
        if (cleanPhone.length >= 10) {
          phonesInFile.set(cleanPhone, (phonesInFile.get(cleanPhone) || 0) + 1);
        }
      }
    }

    // Identificar quais nã£Â£ã†â€™ã£â€šã‚Âºmeros se repetem no arquivo
    phonesInFile.forEach((count, phone) => {
      if (count > 1) {
        result.duplicatesInFile.push(phone);
      }
    });

    // Segunda passada: processar e verificar com o banco
    const processedPhones = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      try {
        if (!row.name && !row.phone && !row.email) {
          result.invalid++;
          result.errors.push(`Linha ${i + 1}: Dados insuficientes (sem nome, telefone ou email)`);
          continue;
        }

        let cleanPhone = '';
        if (row.phone) {
          cleanPhone = row.phone.replace(/\D/g, '');
          if (cleanPhone.length === 11) {
            cleanPhone = '55' + cleanPhone;
          }
        }

        // Se jã£Â£ã†â€™ã£â€šã‚Â¡ processamos este telefone nesta importaã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o, ignorar (jã£Â£ã†â€™ã£â€šã‚Â¡ contado como duplicata do arquivo)
        if (cleanPhone && processedPhones.has(cleanPhone)) {
          continue;
        }
        if (cleanPhone) processedPhones.add(cleanPhone);

        // Verificar se jã£Â£ã†â€™ã£â€šã‚Â¡ existe no banco
        const existingLead = await prisma.lead.findFirst({
          where: {
            OR: [
              { phone: cleanPhone },
              ...(row.email ? [{ email: row.email }] : [])
            ]
          }
        });

        if (existingLead) {
          if (cleanPhone && !result.duplicatesInDb.includes(cleanPhone)) {
            result.duplicatesInDb.push(cleanPhone);
          }
          
          // Atualizar lead existente
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              name: row.name || existingLead.name,
              phone: cleanPhone || existingLead.phone,
              email: row.email || existingLead.email,
              updatedAt: new Date()
            }
          });
          result.updated++;
        } else {
          // Criar novo lead
          await prisma.lead.create({
            data: {
              name: row.name || 'Contato Importado',
              phone: cleanPhone || '',
              email: row.email || null,
              status: 'NEW_LEAD',
              stage: 'NEW',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          result.imported++;
        }
      } catch (error: any) {
        result.invalid++;
        result.errors.push(`Linha ${i + 1}: ${error.message}`);
      }
    }

    return result;
  } catch (error: any) {
    throw new Error(`Erro ao processar arquivo: ${error.message}`);
  }
}