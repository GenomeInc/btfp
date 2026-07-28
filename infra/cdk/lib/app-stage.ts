import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DataStack } from './data-stack.js';
import { ApiStack } from './api-stack.js';
import { WebStack } from './web-stack.js';
import { ScraperStack } from './scraper-stack.js';
import type { EnvConfig } from './config.js';

export interface AppStageProps extends cdk.StageProps {
  envConfig: EnvConfig;
}

export class AppStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: AppStageProps) {
    super(scope, id, props);

    const data = new DataStack(this, 'Data', { envConfig: props.envConfig, env: props.env });

    new ScraperStack(this, 'Scraper', {
      envConfig: props.envConfig,
      contentTable: data.contentTable,
      env: props.env,
    });

    const api = new ApiStack(this, 'Api', {
      envConfig: props.envConfig,
      contentTable: data.contentTable,
      usersTable: data.usersTable,
      env: props.env,
    });

    new WebStack(this, 'Web', {
      envConfig: props.envConfig,
      httpApi: api.httpApi,
      env: props.env,
    });
  }
}
