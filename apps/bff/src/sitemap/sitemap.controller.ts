import { Controller, Get, Header, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { SearchService } from '../search/search.service.js';

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

@Controller()
export class SitemapController {
  constructor(private readonly search: SearchService) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  async sitemap(@Req() req: FastifyRequest): Promise<string> {
    const host = (req.headers['x-forwarded-host'] as string) ?? req.headers.host ?? 'badthingsforpets.com';
    const origin = `https://${host}`;
    const things = await this.search.all();

    const urls = [origin, `${origin}/submit`, ...things.map((t) => `${origin}/things/${t.id}`)]
      .map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  }
}
