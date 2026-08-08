export type RoyaltyStatementStatusValue = 'issued' | 'paid' | 'void';
export type WriterPayoutStatusValue = 'pending' | 'processing' | 'paid' | 'failed';

export interface RoyaltyBookLine {
  id?: string;
  bookId: string | null;
  bookTitle: string;
  unitsSold: number;
  grossRevenue: number;
  royaltyRate: number;
  royaltyAmount: number;
}

export interface RoyaltyStatementRecord {
  id: string;
  periodStart: string;
  periodEnd: string;
  currency: 'GBP';
  grossRevenue: number;
  royaltyAmount: number;
  status: RoyaltyStatementStatusValue;
  issuedAt: string;
  lines: RoyaltyBookLine[];
  payout: null | {
    status: WriterPayoutStatusValue;
    amount: number;
    currency: 'GBP';
    method: string;
    reference: string;
    failureNote: string;
    processedAt: string | null;
  };
}

export interface WriterRoyaltyOverview {
  currency: 'GBP';
  defaultRate: number;
  estimated: {
    unitsSold: number;
    grossRevenue: number;
    royaltyAmount: number;
    books: RoyaltyBookLine[];
  };
  statements: RoyaltyStatementRecord[];
}

export interface AdminRoyaltyDashboard {
  writers: Array<{
    id: string;
    name: string;
    email: string;
    unstatementedUnits: number;
    unstatementedGross: number;
    estimatedRoyalty: number;
  }>;
  statements: Array<RoyaltyStatementRecord & {
    writerName: string;
    writerEmail: string;
  }>;
}
