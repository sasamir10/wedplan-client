import type { Metadata } from "next";
import { FeaturePage } from "../components/FeaturePage";

export const metadata: Metadata = { title: "Sign In" };

export default function SignInPage() {
    return (
        <FeaturePage
            description="Account access is not available yet. Sign-in will be introduced in a later release."
            eyebrow="Account access"
            title="Your WedPlan account is on its way"
        />
    );
}
