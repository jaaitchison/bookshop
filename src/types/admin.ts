export interface AdminStats {
  totalBooks: number;
  totalUsers: number;
  totalRevenue: number;
  totalOrders: number;
  revenueGrowth: number;
  orderGrowth: number;
  userGrowth: number;
}

export interface AdminAction {
  id: string;
  type: 'book_added' | 'user_registered' | 'order_completed' | 'review_posted';
  description: string;
  timestamp: Date;
  user?: string;
}
