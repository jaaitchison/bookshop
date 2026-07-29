import { Hero } from '@/src/components/book/Hero';
import { FeaturedBooks } from '@/src/components/book/FeaturedBooks';

export default function Home() {
  return (
    <div className="w-full">
      <Hero />
      <FeaturedBooks />
    </div>
  );
}
