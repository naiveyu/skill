import HeroSection from '@/components/sections/hero-section'
import FeaturesGridSection from '@/components/sections/features-grid-section'
import FeatureDeepDiveSection from '@/components/sections/feature-deep-dive-section'
import ComparisonSection from '@/components/sections/comparison-section'
import TechStackSection from '@/components/sections/tech-stack-section'
import DownloadSection from '@/components/sections/download-section'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesGridSection />
      <FeatureDeepDiveSection />
      <ComparisonSection />
      <TechStackSection />
      <DownloadSection />
    </>
  )
}
