import type { Metadata } from "next";
import { FeaturePage } from "../components/FeaturePage";

export const metadata: Metadata = { title: "Get Started" };

export default function GetStartedPage() {
    return (
        <FeaturePage
            description="WedPlan account creation is not open yet. This page will be updated when registration becomes available."
            eyebrow="Get started"
            title="Begin planning with WedPlan"
        />
    );
}
