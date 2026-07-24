import { HeroSection } from "@/components/home/hero-section";
import { AnimatedGradientBackground } from '@/components/ui/animated-gradient-background';
import PlacementStats from "@/components/home/placement-stats";
import Domains from '@/components/home/domains'

export default function UploadPage() {
  return (
    <div
      data-homepage-shell
      className="relative min-h-screen overflow-x-clip bg-black pb-20"
    >
      {/* Animated gradient background with reduced opacity */}
      <AnimatedGradientBackground />
      {/* Black overlay for readability */}
      <div className="absolute inset-0 z-10  pointer-events-none" />
      <div className="relative z-20 flex flex-col min-h-screen">
        <div className="flex min-h-svh items-center justify-center">
          <HeroSection />
        </div>
        <div className="pb-8 md:pb-12">
          <Domains />
        </div>

        <PlacementStats />
        
      </div>
    </div>
  );
}
