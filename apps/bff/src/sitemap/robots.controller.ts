import { Controller, Get, Header } from '@nestjs/common';

const PROD_ROBOTS = `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: CCBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: /sitemap.xml
`;

// Dev isn't public — WAF Basic Auth already blocks unauthenticated bots at
// the edge, but this covers any crawler that somehow gets in and respects
// robots.txt anyway.
const NON_PROD_ROBOTS = `User-agent: *
Disallow: /
`;

@Controller()
export class RobotsController {
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  robots(): string {
    return process.env.STAGE === 'prod' ? PROD_ROBOTS : NON_PROD_ROBOTS;
  }
}
