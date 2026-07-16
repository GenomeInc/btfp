import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DynamoModule } from './dynamo/dynamo.module.js';
import { PetTypesModule } from './pet-types/pet-types.module.js';
import { ThingTypesModule } from './thing-types/thing-types.module.js';
import { ThingsModule } from './things/things.module.js';
import { SearchModule } from './search/search.module.js';
import { AuthModule } from './auth/auth.module.js';
import { VerificationModule } from './verification/verification.module.js';
import { ContributionsModule } from './contributions/contributions.module.js';
import { SitemapModule } from './sitemap/sitemap.module.js';
import { McpModule } from './mcp/mcp.module.js';
import { ProfessionalVerificationModule } from './professional-verification/professional-verification.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DynamoModule,
    SearchModule,
    PetTypesModule,
    ThingTypesModule,
    ThingsModule,
    AuthModule,
    VerificationModule,
    ContributionsModule,
    SitemapModule,
    McpModule,
    ProfessionalVerificationModule,
  ],
})
export class AppModule {}
