import axios from 'axios';
import { ImageProvider, ImageProviderCandidate } from './imageProvider';

const UA = 'SaleIA-SiteFactory/3.0 (image-engine; contact: dev@sale-ia.local)';

export class UnsplashImageProvider implements ImageProvider {
  readonly name = 'unsplash';

  async search(query: string): Promise<ImageProviderCandidate[]> {
    const key = process.env.UNSPLASH_ACCESS_KEY || '';
    if (!key) return [];

    try {
      const res = await axios.get('https://api.unsplash.com/search/photos', {
        params: {
          query,
          per_page: 8,
          orientation: 'landscape'
        },
        headers: {
          Authorization: 'Client-ID ' + key,
          'User-Agent': UA
        },
        timeout: 20000
      });

      return (res.data.results || [])
        .map((p: any) => ({
          url: p.urls?.regular || p.urls?.raw || '',
          width: p.width || 0,
          height: p.height || 0,
          author: p.user?.name || '',
          license: 'Unsplash License (uso comercial gratuito)',
          pageUrl: p.links?.html || '',
          alt: p.alt_description || '',
          mime: 'image/jpeg'
        }))
        .filter((c: ImageProviderCandidate) => c.url);
    } catch (e: any) {
      console.warn(
        '[ImageProvider:Unsplash] falhou:',
        e?.response?.status || e?.message
      );
      return [];
    }
  }
}

export const unsplashImageProvider = new UnsplashImageProvider();
