import { HeroSection } from "@/components/home/HeroSection"
import { PopularDestinations } from "@/components/home/PopularDestinations"
import { PopularFeatures } from "@/components/home/PopularFeatures"

export default function HomePage() {
  return (
    <main>
      {/* Hero Section with Glamping Search Widget */}
      <HeroSection />

      {/* Popular Glamping Destinations Grid */}
      <PopularDestinations />

      {/* Popular Features Grid (6x2) */}
      <PopularFeatures />
    </main>
  );
}
