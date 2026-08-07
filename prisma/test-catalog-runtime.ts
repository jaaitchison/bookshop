import "dotenv/config";
import { getCatalogBooks, getBookById, getFeaturedBooks } from "../src/lib/catalog-data";

async function main() {
  const books = await getCatalogBooks();
  const featured = await getFeaturedBooks();
  const first = books[0];
  const detail = first ? await getBookById(first.id) : undefined;

  console.log("");
  console.log("Catalogue runtime smoke test");
  console.log(`Books returned: ${books.length}`);
  console.log(`Featured books returned: ${featured.length}`);
  console.log(`First book: ${first?.title ?? "none"}`);
  console.log(`Detail lookup: ${detail?.title ?? "not found"}`);

  if (books.length === 0) {
    throw new Error("Catalogue returned no books.");
  }

  if (!detail) {
    throw new Error("Book detail lookup failed.");
  }

  console.log("Runtime catalogue test PASSED.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});