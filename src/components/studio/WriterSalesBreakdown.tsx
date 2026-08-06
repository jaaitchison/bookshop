import { formatGbp } from "@/src/lib/currency";
import type { WriterSalesAnalytics } from "@/src/types/studio";

export default function WriterSalesBreakdown({
  sales,
}: {
  sales: WriterSalesAnalytics;
}) {
  if (sales.books.length === 0) {
    return (
      <p className="text-sm text-[var(--bookshop-muted)]">
        Publish a book to begin tracking sales and revenue here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            <th className="px-4 py-3 font-semibold text-[var(--bookshop-text)]">Published book</th>
            <th className="px-4 py-3 text-right font-semibold text-[var(--bookshop-text)]">Books sold</th>
            <th className="px-4 py-3 text-right font-semibold text-[var(--bookshop-text)]">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {sales.books.map((book) => (
            <tr key={book.bookId}>
              <td className="px-4 py-3 font-medium text-[var(--bookshop-text)]">{book.title}</td>
              <td className="px-4 py-3 text-right text-[var(--bookshop-muted)]">{book.booksSold.toLocaleString("en-GB")}</td>
              <td className="px-4 py-3 text-right font-semibold text-[var(--bookshop-text)]">{formatGbp(book.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
