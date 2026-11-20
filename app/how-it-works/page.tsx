import type { Metadata } from "next";
import { FeaturePage } from "../components/FeaturePage";

export const metadata: Metadata = { title: "How It Works" };

export default function HowItWorksPage() {
    return (
        <FeaturePage
            description="We are shaping a straightforward planning journey that brings service discovery and celebration details together. More guidance will appear here as WedPlan develops."
            eyebrow="How it works"
            title="A calmer way to plan"
        />
    );
}
