export interface CheckoutShipping {
  name: string;
  email: string;
  address: string;
  city: string;
  postcode: string;
}

export interface CheckoutInitialization {
  paymentAttemptId: string;
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  amountCents: number;
  currency: "usd";
}

export type PaymentAttemptState = "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

