import { Hero } from '@/src/components/book/Hero';
import { FeaturedBooks } from '@/src/components/book/FeaturedBooks';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="w-full">
      <Hero />
      <FeaturedBooks />
    </div>
  );
}
