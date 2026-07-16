#!/usr/bin/env node
import 'source-map-support/register.js';
import * as cdk from 'aws-cdk-lib';
import { DnsStack } from '../lib/dns-stack.js';
import { EmailStack } from '../lib/email-stack.js';
import { AppStage } from '../lib/app-stage.js';
import { ROOT_DOMAIN, AWS_ACCOUNT, AWS_REGION, environments } from '../lib/config.js';

const app = new cdk.App();

const env = { account: AWS_ACCOUNT, region: AWS_REGION };

new DnsStack(app, 'BtfpDns', {
  env,
  domainName: ROOT_DOMAIN,
});

new EmailStack(app, 'BtfpEmail', { env });

new AppStage(app, 'BtfpDev', { env, envConfig: environments.dev });
new AppStage(app, 'BtfpProd', { env, envConfig: environments.prod });
