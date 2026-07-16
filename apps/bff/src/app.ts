import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from './app.module.js';

export async function createApp(adapter: FastifyAdapter): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    logger: ['error', 'warn', 'log'],
  });

  await app.register(fastifyCookie);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? true, credentials: true });
  // sitemap.xml is excluded so it can live at the site root instead of under /api.
  app.setGlobalPrefix('api', { exclude: ['sitemap.xml'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const openApiConfig = new DocumentBuilder()
    .setTitle('badthingsforpets.com API')
    .setDescription('Public read API for pet-danger data. GET endpoints are unauthenticated and CORS-open.')
    .setVersion('1.0')
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);
  app.getHttpAdapter().getInstance().get('/api/openapi.json', async (_req, reply) => {
    reply.send(openApiDocument);
  });

  return app;
}
