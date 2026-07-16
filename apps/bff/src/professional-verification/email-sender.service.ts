import { Injectable } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const FROM_ADDRESS = process.env.SES_FROM_ADDRESS ?? 'noreply@badthingsforpets.com';

@Injectable()
export class EmailSenderService {
  private readonly client = new SESClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

  async sendVerificationCode(toEmail: string, code: string): Promise<void> {
    const stagePrefix = process.env.STAGE === 'prod' ? '' : `[${process.env.STAGE ?? 'dev'}] `;
    await this.client.send(
      new SendEmailCommand({
        Source: FROM_ADDRESS,
        Destination: { ToAddresses: [toEmail] },
        Message: {
          Subject: { Data: `${stagePrefix}Your badthingsforpets.com verification code` },
          Body: {
            Text: {
              Data:
                `Your verification code is: ${code}\n\n` +
                "This code expires in 15 minutes. If you didn't request this, you can ignore this email.",
            },
          },
        },
      }),
    );
  }
}
