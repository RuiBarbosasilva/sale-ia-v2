import axios from 'axios';
import { ImageProvider, ImageProviderCandidate } from './imageProvider';

const UA = 'SaleIA-SiteFactory/3.0 (image-engine; openverse)';

export class OpenverseImageProvider implements ImageProvider {
  readonly name = 'openverse';

  async search(query: string): Promise<ImageProviderCandidate[]> {
    try {
      const res = await axios.get('https://api.openverse.org/v1/images/', {
        params: { q: query, page_size: 10, mature: false },
        headers: { 'User-Agent': UA },
        timeout: 15000
      });

      return (res.data?.results || []).map((p: any) => ({
        url: p.thumbnail || p.url || '',
        width: Number(p.width || 0),
        height: Number(p.height || 0),
        author: p.creator || '',
        license: p.license ? String(p.license).toUpperCase() : 'Openverse (verifique licença)',
        pageUrl: p.foreign_landing_url || p.url || '',
        alt: p.title || p.description || '',
        mime: p.mime_type || ''
      })).filter((c: ImageProviderCandidate) => c.url);
    } catch (e: any) {
      console.warn('[ImageProvider:Openverse] falhou:', e?.response?.status || e?.message);
      return [];
    }
  }
}

export const openverseImageProvider = new OpenverseImageProvider();
