// Hardcoded rather than an npm package — small, auditable, no supply-chain
// dependency for something security-relevant. Not exhaustive; extend as needed.
const FREE_EMAIL_DOMAINS = new Set([
  // Major consumer webmail
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.co.in',
  'ymail.com',
  'rocketmail.com',
  'hotmail.com',
  'hotmail.co.uk',
  'outlook.com',
  'outlook.co.uk',
  'live.com',
  'msn.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',
  // Privacy-focused webmail
  'protonmail.com',
  'proton.me',
  'pm.me',
  'tutanota.com',
  'tutanota.de',
  'hushmail.com',
  'fastmail.com',
  // Other free providers
  'gmx.com',
  'gmx.us',
  'gmx.net',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'yandex.ru',
  'qq.com',
  '163.com',
  '126.com',
  'naver.com',
  'hey.com',
  'inbox.com',
  // Major US ISP consumer email
  'comcast.net',
  'verizon.net',
  'att.net',
  'sbcglobal.net',
  'earthlink.net',
  // Disposable/throwaway
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'yopmail.com',
  'temp-mail.org',
]);

export function isFreeEmailDomain(domain: string): boolean {
  return FREE_EMAIL_DOMAINS.has(domain.toLowerCase());
}
