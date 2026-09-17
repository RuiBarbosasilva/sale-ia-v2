import axios from 'axios';
import { ImageProvider, ImageProviderCandidate } from './imageProvider';

const UA = 'SaleIA-SiteFactory/3.0 (image-engine; contact: dev@sale-ia.local)';

export class PexelsImageProvider implements ImageProvider {
  readonly name = 'pexels';

  async search(query: string): Promise<ImageProviderCandidate[]> {
    const key = process.env.PEXELS_API_KEY || '';
    if (!key) return [];

    try {
      const res = await axios.get('https://api.pexels.com/v1/search', {
        params: {
          query,
          per_page: 8,
          orientation: 'landscape'
        },
        headers: {
          Authorization: key,
          'User-Agent': UA
        },
        timeout: 20000
      });

      return (res.data.photos || [])
        .map((p: any) => ({
          url: p.src?.large2x || p.src?.large || '',
          width: p.width || 0,
          height: p.height || 0,
          author: p.photographer || '',
          license: 'Pexels License (uso comercial gratuito)',
          pageUrl: p.url || '',
          alt: p.alt || '',
          mime: 'image/jpeg'
        }))
        .filter((c: ImageProviderCandidate) => c.url);
    } catch (e: any) {
      console.warn(
        '[ImageProvider:Pexels] falhou:',
        e?.response?.status || e?.message
      );
      return [];
    }
  }
}

export const pexelsImageProvider = new PexelsImageProvider();
