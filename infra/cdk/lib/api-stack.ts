import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EnvConfig } from './config.js';
import {
  BEDROCK_INFERENCE_PROFILE_ID,
  DEV_JWT_SECRET,
  PROD_JWT_SECRET,
  ROOT_DOMAIN,
  SES_FROM_ADDRESS,
} from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ApiStackProps extends cdk.StackProps {
  envConfig: EnvConfig;
  contentTable: dynamodb.Table;
  usersTable: dynamodb.Table;
}

/**
 * One Lambda running the whole NestJS BFF behind an HTTP API (cheaper than
 * REST API). CloudFront (in WebStack) fronts this at /api/*, so there's no
 * custom domain or ACM cert on the API Gateway itself.
 */
export class ApiStack extends cdk.Stack {
  readonly httpApi: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const handler = new lambda.Function(this, 'BffFunction', {
      functionName: `btfp-${props.envConfig.envName}-bff`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'lambda.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../apps/bff/dist')),
      memorySize: 512,
      timeout: cdk.Duration.seconds(15),
      environment: {
        NODE_ENV: 'production',
        STAGE: props.envConfig.envName,
        CONTENT_TABLE_NAME: props.contentTable.tableName,
        USERS_TABLE_NAME: props.usersTable.tableName,
        SES_FROM_ADDRESS,
        BEDROCK_INFERENCE_PROFILE_ID,
        JWT_SECRET: props.envConfig.envName === 'prod' ? PROD_JWT_SECRET : DEV_JWT_SECRET,
      },
    });

    props.contentTable.grantReadWriteData(handler);
    props.usersTable.grantReadWriteData(handler);

    handler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: [`arn:aws:ses:${this.region}:${this.account}:identity/${ROOT_DOMAIN}`],
      }),
    );

    // Cross-region inference profiles need permission on both the profile
    // itself and the underlying foundation models it can route requests to.
    handler.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/${BEDROCK_INFERENCE_PROFILE_ID}`,
          'arn:aws:bedrock:*::foundation-model/anthropic.claude-*',
        ],
      }),
    );

    this.httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: `btfp-${props.envConfig.envName}-api`,
      defaultIntegration: new HttpLambdaIntegration('BffIntegration', handler),
    });

    new cdk.CfnOutput(this, 'HttpApiUrl', { value: this.httpApi.apiEndpoint });
  }
}
