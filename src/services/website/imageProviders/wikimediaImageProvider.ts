import axios from 'axios';
import { ImageProvider, ImageProviderCandidate } from './imageProvider';

const UA = 'SaleIA-SiteFactory/3.0 (image-engine; contact: dev@sale-ia.local)';

const stripHtml = (s: string) =>
  (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

export class WikimediaImageProvider implements ImageProvider {
  readonly name = 'wikimedia-commons';

  async search(query: string): Promise<ImageProviderCandidate[]> {
    try {
      const res = await axios.get('https://commons.wikimedia.org/w/api.php', {
        params: {
          action: 'query',
          format: 'json',
          generator: 'search',
          gsrsearch: 'filetype:bitmap ' + query,
          gsrnamespace: 6,
          gsrlimit: 8,
          prop: 'imageinfo',
          iiprop: 'url|size|mime|extmetadata',
          iiurlwidth: 1600
        },
        headers: {
          'User-Agent': UA,
          'Api-User-Agent': UA
        },
        timeout: 20000
      });

      const pages = res.data?.query?.pages || {};
      const out: ImageProviderCandidate[] = [];

      for (const k of Object.keys(pages)) {
        const page = pages[k];
        const ii = page.imageinfo && page.imageinfo[0];

        if (!ii) continue;

        out.push({
          url: ii.thumburl || ii.url || '',
          width: ii.thumbwidth || ii.width || 0,
          height: ii.thumbheight || ii.height || 0,
          author: stripHtml(ii.extmetadata?.Artist?.value || ''),
          license: stripHtml(
            ii.extmetadata?.License?.value || 'CC (ver Commons)'
          ),
          pageUrl: ii.descriptionurl || '',
          alt:
            stripHtml(
              ii.extmetadata?.ImageDescription?.value || ''
            ) ||
            String(page.title || '')
              .replace(/^File:/, '')
              .replace(/\.[a-z]+$/i, '')
              .replace(/[_-]+/g, ' '),
          mime: ii.mime || ''
        });
      }

      return out.filter(
        (c: ImageProviderCandidate) => c.url
      );
    } catch (e: any) {
      console.warn(
        '[ImageProvider:Wikimedia] falhou:',
        e?.response?.status || e?.message
      );
      return [];
    }
  }
}

export const wikimediaImageProvider = new WikimediaImageProvider();
