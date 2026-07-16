export type OAuthProvider = 'github' | 'google';

export type ProfessionalStatus =
  | 'none'
  | 'pending_email_confirmation'
  | 'awaiting_review'
  | 'verified'
  | 'rejected';

export interface ProfessionalVerification {
  status: ProfessionalStatus;
  domain: string;
  /** Bedrock's guess at the org type, e.g. "veterinary_clinic" — a signal for the human reviewer, not a gate. */
  orgClassification?: string;
  orgClassificationReasoning?: string;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface User {
  id: string;
  provider: OAuthProvider;
  providerAccountId: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  providerAccountCreatedAt?: string;
  verifiedContributor: boolean;
  verifiedAt?: string;
  professional?: ProfessionalVerification;
  createdAt: string;
}
