import { FastifyAdapter } from '@nestjs/platform-fastify';
import awsLambdaFastify from '@fastify/aws-lambda';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { createApp } from './app.js';

type Proxy = (event: unknown, context: unknown) => Promise<unknown>;
let proxy: Proxy | undefined;

// GithubStrategy reads GITHUB_CLIENT_SECRET synchronously at construction
// time (during createApp() below), so this has to resolve before that call.
// Only set in envs that actually have a GitHub OAuth app configured — see
// api-stack.ts — everywhere else this is a no-op and the strategy falls
// back to its "not-configured" placeholder as before.
async function loadGithubClientSecret(): Promise<void> {
  const parameterName = process.env.GITHUB_CLIENT_SECRET_PARAM;
  if (!parameterName || process.env.GITHUB_CLIENT_SECRET) return;
  const ssm = new SSMClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
  const result = await ssm.send(
    new GetParameterCommand({ Name: parameterName, WithDecryption: true }),
  );
  if (result.Parameter?.Value) process.env.GITHUB_CLIENT_SECRET = result.Parameter.Value;
}

async function bootstrap(): Promise<Proxy> {
  await loadGithubClientSecret();
  const adapter = new FastifyAdapter();
  const app = await createApp(adapter);
  await app.init();
  return awsLambdaFastify(adapter.getInstance()) as Proxy;
}

// TEMPORARY: diagnosing a prod-only 500 on POST /verification/quiz where the
// body arrives as undefined inside the controller despite the browser
// sending a real Content-Length. Logs enough of the raw APIGW v2 event shape
// to tell whether the body ever reached the Lambda at all, without ever
// logging cookie/auth values. Remove once root-caused.
function logRawEventShapeForQuizDiagnostic(event: unknown): void {
  if (typeof event !== 'object' || event === null) return;
  const e = event as Record<string, unknown>;
  const path = (e.rawPath as string | undefined) ?? (e.path as string | undefined);
  if (!path?.includes('verification/quiz')) return;
  const headers = (e.headers as Record<string, unknown> | undefined) ?? {};
  console.warn(
    `[quiz-diagnostic] method=${(e.requestContext as Record<string, unknown> | undefined)?.http ? JSON.stringify((e.requestContext as Record<string, unknown>).http) : e.httpMethod} ` +
      `contentType=${headers['content-type'] ?? headers['Content-Type']} ` +
      `contentLength=${headers['content-length'] ?? headers['Content-Length']} ` +
      `isBase64Encoded=${e.isBase64Encoded} ` +
      `bodyType=${typeof e.body} ` +
      `bodyLength=${typeof e.body === 'string' ? e.body.length : 'n/a'} ` +
      `hasCookiesArray=${Array.isArray(e.cookies)} cookiesArrayLength=${Array.isArray(e.cookies) ? e.cookies.length : 'n/a'}`,
  );
}

export const handler = async (event: unknown, context: unknown) => {
  proxy ??= await bootstrap();
  logRawEventShapeForQuizDiagnostic(event);
  return proxy(event, context);
};
