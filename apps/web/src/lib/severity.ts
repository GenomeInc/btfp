import type { Severity } from '@btfp/shared-types';

export const SEVERITY_GUIDANCE: Record<Severity, string> = {
  severe: "Go to the vet immediately — don't wait for symptoms.",
  moderate: 'Call your vet, describe what happened, and follow their guidance.',
  mild: "Watch your pet's behavior. Only go in if symptoms appear.",
  unknown: 'Severity not yet documented — when in doubt, call your vet or animal poison control.',
};
