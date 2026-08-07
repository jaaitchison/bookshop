export const TERMS_VERSION = "2026-08-06";
export const REFUND_POLICY_VERSION = "2026-08-06";

export type DigitalContentConsent = {
  acceptedAt: Date;
  termsVersion: typeof TERMS_VERSION;
  refundPolicyVersion: typeof REFUND_POLICY_VERSION;
};

export function createDigitalContentConsent(accepted: unknown): DigitalContentConsent {
  if (accepted !== true) throw new Error("Digital content consent is required before payment.");
  return {
    acceptedAt: new Date(),
    termsVersion: TERMS_VERSION,
    refundPolicyVersion: REFUND_POLICY_VERSION,
  };
}
