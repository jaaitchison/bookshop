import { promises as fs } from 'fs';
import path from 'path';

interface WishlistState {
  items: string[];
}

const wishlistFile = path.join(process.cwd(), 'data', 'wishlist.json');

async function readWishlistState(): Promise<WishlistState> {
  try {
    const content = await fs.readFile(wishlistFile, 'utf8');
    const parsed = JSON.parse(content) as Partial<WishlistState>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items.filter((item): item is string => typeof item === 'string') : [],
    };
  } catch {
    await fs.mkdir(path.dirname(wishlistFile), { recursive: true });
    await fs.writeFile(wishlistFile, JSON.stringify({ items: [] }, null, 2), 'utf8');
    return { items: [] };
  }
}

async function writeWishlistState(state: WishlistState) {
  await fs.mkdir(path.dirname(wishlistFile), { recursive: true });
  await fs.writeFile(wishlistFile, JSON.stringify(state, null, 2), 'utf8');
}

export async function getWishlistItems() {
  return readWishlistState();
}

export async function toggleWishlistItem(bookId: string, action: 'add' | 'remove') {
  const state = await readWishlistState();
  const nextItems = action === 'add'
    ? Array.from(new Set([...state.items, bookId]))
    : state.items.filter((item) => item !== bookId);

  await writeWishlistState({ items: nextItems });
  return nextItems;
}
