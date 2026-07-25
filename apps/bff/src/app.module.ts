import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DynamoModule } from '@mycota/dynamo';
import { MycotaAuthModule } from '@mycota/auth';
import { ProfessionalVerificationModule } from '@mycota/professional-verification';
import { PetTypesModule } from './pet-types/pet-types.module.js';
import { ThingTypesModule } from './thing-types/thing-types.module.js';
import { ThingsModule } from './things/things.module.js';
import { SearchModule } from './search/search.module.js';
import { VerificationModule } from './verification/verification.module.js';
import { ContributionsModule } from './contributions/contributions.module.js';
import { SitemapModule } from './sitemap/sitemap.module.js';
import { McpModule } from './mcp/mcp.module.js';
import { buildMycotaAuthConfig } from './mycota-config.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DynamoModule,
    MycotaAuthModule.forRootAsync({ useFactory: buildMycotaAuthConfig }),
    SearchModule,
    PetTypesModule,
    ThingTypesModule,
    ThingsModule,
    VerificationModule,
    ContributionsModule,
    SitemapModule,
    McpModule,
    ProfessionalVerificationModule,
  ],
})
export class AppModule {}
