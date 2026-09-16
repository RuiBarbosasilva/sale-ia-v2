import QRCode from "qrcode";

function formatTag(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function calculateCRC16(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface PixOptions {
  key: string;            // Chave PIX (E-mail, CPF, CNPJ ou Aleatória)
  name: string;           // Nome do Recebedor (mã£Â£ã‚Â¡x 25 chars)
  city: string;           // Cidade do Recebedor (mã£Â£ã‚Â¡x 15 chars)
  amount: number;         // Valor do Orã£Â£ã‚Â§amento
  txId?: string;          // ID da transação / número do orã£Â£ã‚Â§amento
}

export function generatePixPayload({ key, name, city, amount, txId = "***" }: PixOptions): string {
  const cleanName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25);
  const cleanCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 15);
  const formattedAmount = amount.toFixed(2);

  const merchantAccountInfo = formatTag("00", "br.gov.bcb.pix") + formatTag("01", key);
  const additionalData = formatTag("05", txId);

  const payloadHeader =
    formatTag("00", "01") +
    formatTag("01", "12") +
    formatTag("26", merchantAccountInfo) +
    formatTag("52", "0000") +
    formatTag("53", "986") +
    formatTag("54", formattedAmount) +
    formatTag("58", "BR") +
    formatTag("59", cleanName) +
    formatTag("60", cleanCity) +
    formatTag("62", additionalData) +
    "6304";

  const crc = calculateCRC16(payloadHeader);
  return `${payloadHeader}${crc}`;
}

export async function generatePixImageBase64(pixCode: string): Promise<string> {
  return await QRCode.toDataURL(pixCode);
}