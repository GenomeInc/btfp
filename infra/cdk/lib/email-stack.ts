import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ses from 'aws-cdk-lib/aws-ses';
import { HOSTED_ZONE_ID, ROOT_DOMAIN } from './config.js';

/**
 * SES domain identity, deployed once (like BtfpDns) rather than per-stage —
 * dev and prod share the same sending domain. Auto-creates DKIM + MAIL FROM
 * DNS records against the existing hosted zone.
 *
 * New SES accounts start in sandbox mode (can only send to
 * individually-verified recipients) until production access is requested
 * via the SES console — an AWS Support review, not automatable here.
 */
export class EmailStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const hostedZone = route53.PublicHostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: HOSTED_ZONE_ID,
      zoneName: ROOT_DOMAIN,
    });

    new ses.EmailIdentity(this, 'EmailIdentity', {
      identity: ses.Identity.publicHostedZone(hostedZone),
    });
  }
}
