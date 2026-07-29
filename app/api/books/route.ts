import { NextResponse } from 'next/server';
import type { FilterOptions } from '@/src/data/books';
import { filterCatalogBooks } from '@/src/lib/catalog-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const filters: FilterOptions = {
    search: searchParams.get('search') ?? undefined,
    genre: searchParams.get('genre') ?? undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    minRating: searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined,
    sortBy: (searchParams.get('sortBy') as FilterOptions['sortBy']) ?? undefined,
  };

  const books = await filterCatalogBooks(filters);
  return NextResponse.json(books);
}
