import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { grantSsmConfigRead } from '@bubltec/mycota-cdk';
import type { EnvConfig } from './config.js';
import { BEDROCK_INFERENCE_PROFILE_ID } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ScraperStackProps extends cdk.StackProps {
  envConfig: EnvConfig;
  contentTable: dynamodb.Table;
}

/**
 * Scheduled ECS Fargate task, not a long-running service — every 6h it
 * fetches new Reddit posts from a handful of subreddits, runs them through
 * Bedrock to extract candidate pet-hazard reports, and writes them as
 * *unverified* Contribution items into the existing moderation queue
 * (never a verified Thing directly — see docs/scraper.md). No inbound
 * traffic, so the VPC has only public subnets and no NAT gateway — near-
 * zero extra cost (VPC/IGW/public IP are free; only NAT gateways cost
 * money, and none are needed here). assignPublicIp is required on the
 * task below as the direct consequence of that: with no NAT gateway, a
 * task without a public IP has no route out at all.
 */
export class ScraperStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ScraperStackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'ScraperVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [{ name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 }],
    });

    const cluster = new ecs.Cluster(this, 'Cluster', { vpc, containerInsights: false });

    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu: 256,
      memoryLimitMiB: 512,
    });

    grantSsmConfigRead(taskDef.taskRole, { namespace: 'btfp', env: props.envConfig.envName });
    props.contentTable.grantReadWriteData(taskDef.taskRole);

    // Cross-region inference profiles need permission on both the profile
    // itself and the underlying foundation models it can route requests to
    // — same scoping api-stack.ts already uses for the bff Lambda.
    taskDef.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/${BEDROCK_INFERENCE_PROFILE_ID}`,
          'arn:aws:bedrock:*::foundation-model/anthropic.claude-*',
        ],
      }),
    );

    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    taskDef.addContainer('scraper', {
      image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../../../apps/scraper'), {
        platform: Platform.LINUX_AMD64,
      }),
      environment: {
        STAGE: props.envConfig.envName,
        CONTENT_TABLE_NAME: props.contentTable.tableName,
        BEDROCK_INFERENCE_PROFILE_ID,
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'scraper', logGroup }),
    });

    const rule = new events.Rule(this, 'ScheduleRule', {
      // Arbitrary starting cadence — easy to tune later based on observed
      // post volume and Bedrock cost.
      schedule: events.Schedule.rate(cdk.Duration.hours(6)),
    });

    rule.addTarget(
      new targets.EcsTask({
        cluster,
        taskDefinition: taskDef,
        subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
        assignPublicIp: true,
        taskCount: 1,
      }),
    );

    new cdk.CfnOutput(this, 'ClusterArn', { value: cluster.clusterArn });
    new cdk.CfnOutput(this, 'TaskDefinitionArn', { value: taskDef.taskDefinitionArn });
  }
}
