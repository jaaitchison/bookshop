const GBP_FORMATTER = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatGbp(value: number): string {
  return GBP_FORMATTER.format(Number.isFinite(value) ? value : 0);
}
