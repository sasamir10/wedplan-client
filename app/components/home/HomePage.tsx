import { CategoriesSection } from "./CategoriesSection";
import { FeaturedServicesSection } from "./FeaturedServicesSection";
import { FinalCtaSection } from "./FinalCtaSection";
import { HeroSection } from "./HeroSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { WhyWedPlanSection } from "./WhyWedPlanSection";

export function HomePage() {
    return (
        <>
            <HeroSection />
            <FeaturedServicesSection />
            <CategoriesSection />
            <WhyWedPlanSection />
            <HowItWorksSection />
            <FinalCtaSection />
        </>
    );
}
