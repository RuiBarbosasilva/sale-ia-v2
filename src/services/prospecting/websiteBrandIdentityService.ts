// src/services/prospecting/websiteBrandIdentityService.ts

import axios from 'axios';
import { prisma } from '../../modules/mercadoLivre/lib/prisma';
import { BrandIdentityData, IdentityConfidence } from '../../types/prospecting.types';

export class WebsiteBrandIdentityService {
  
  async extractIdentity(prospectId: string): Promise<BrandIdentityData> {
    const prospect = await prisma.websiteProspect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      throw new Error('PROSPECT_NOT_FOUND');
    }

    const identity: BrandIdentityData = {
      identityConfidence: 'UNKNOWN',
      sources: [],
    };

    if (prospect.currentWebsite) {
      try {
        const websiteIdentity = await this.extractFromWebsite(prospect.currentWebsite);
        if (websiteIdentity) {
          Object.assign(identity, websiteIdentity);
          identity.sources.push('WEBSITE');
        }
      } catch (error: any) {
        console.error(`[Identity] Website extraction failed:`, error.message);
      }
    }

    identity.identityConfidence = this.calculateConfidence(identity);

    await prisma.websiteBrandIdentity.upsert({
      where: { prospectId },
      create: {
        prospectId,
        logoUrl: identity.logoUrl,
        primaryColor: identity.primaryColor,
        secondaryColor: identity.secondaryColor,
        accentColor: identity.accentColor,
        visualStyle: identity.visualStyle,
        photoStyle: identity.photoStyle,
        toneOfVoice: identity.toneOfVoice,
        identityConfidence: identity.identityConfidence,
        sources: JSON.stringify(identity.sources),
      },
      update: {
        logoUrl: identity.logoUrl,
        primaryColor: identity.primaryColor,
        secondaryColor: identity.secondaryColor,
        accentColor: identity.accentColor,
        visualStyle: identity.visualStyle,
        photoStyle: identity.photoStyle,
        toneOfVoice: identity.toneOfVoice,
        identityConfidence: identity.identityConfidence,
        sources: JSON.stringify(identity.sources),
      },
    });

    return identity;
  }

  private async extractFromWebsite(websiteUrl: string): Promise<Partial<BrandIdentityData> | null> {
    try {
      const response = await axios.get(websiteUrl, {
        timeout: 10000,
        headers: { 'User-Agent': 'SaleIA-BrandAnalyzer/1.0' },
        maxRedirects: 3,
      });

      const html = response.data;
      const identity: Partial<BrandIdentityData> = {};

      const logoMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i) ||
                        html.match(/<img[^>]*class=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i);
      if (logoMatch) {
        identity.logoUrl = logoMatch[1];
      }

      const colors = this.extractColors(html);
      if (colors.length > 0) {
        identity.primaryColor = colors[0];
        if (colors.length > 1) identity.secondaryColor = colors[1];
        if (colors.length > 2) identity.accentColor = colors[2];
      }

      const fontMatch = html.match(/font-family:\s*["']?([^;"'}]+)/i);
      if (fontMatch) {
        identity.fontSuggestions = [fontMatch[1].trim()];
      }

      if (html.includes('viewport')) {
        identity.visualStyle = 'RESPONSIVE_MODERN';
      } else {
        identity.visualStyle = 'TRADITIONAL';
      }

      return identity;
    } catch {
      return null;
    }
  }

  private extractColors(html: string): string[] {
    const colorRegex = /#[0-9A-Fa-f]{6}\b/g;
    const matches = html.match(colorRegex) || [];
    
    const frequency: { [key: string]: number } = {};
    for (const color of matches) {
      frequency[color] = (frequency[color] || 0) + 1;
    }

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([color]) => color);
  }

  private calculateConfidence(identity: BrandIdentityData): IdentityConfidence {
    let signals = 0;
    
    if (identity.logoUrl) signals++;
    if (identity.primaryColor) signals++;
    if (identity.visualStyle) signals++;
    if (identity.sources.length > 0) signals++;

    if (signals >= 3) return 'HIGH';
    if (signals >= 2) return 'MEDIUM';
    if (signals >= 1) return 'LOW';
    return 'UNKNOWN';
  }
}

export const websiteBrandIdentityService = new WebsiteBrandIdentityService();