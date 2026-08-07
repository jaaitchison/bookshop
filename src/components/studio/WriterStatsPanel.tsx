import { formatGbp } from '@/src/lib/currency';
import type { WriterStats } from '@/src/types/studio';

interface WriterStatsPanelProps {
  stats: WriterStats;
}

export default function WriterStatsPanel({ stats }: WriterStatsPanelProps) {
  const statCards = [
    { label: 'Total books', value: stats.totalBooks.toLocaleString('en-GB'), marker: 'Catalogue' },
    { label: 'Published books', value: stats.publishedBooks.toLocaleString('en-GB'), marker: 'Live' },
    { label: 'Total books sold', value: stats.totalBooksSold.toLocaleString('en-GB'), marker: 'Sales' },
    { label: 'Revenue earned', value: formatGbp(stats.totalRevenue), marker: 'GBP' },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card) => (
        <div key={card.label} className="bookshop-card rounded-[1.5rem] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--bookshop-muted)]">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-[var(--bookshop-text)]">{card.value}</p>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
              {card.marker}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
