import type { Metadata } from "next";
import { FeaturePage } from "../components/FeaturePage";

export const metadata: Metadata = { title: "For Wedding Vendors" };

export default function ForVendorsPage() {
    return (
        <FeaturePage
            description="Vendor onboarding is not available yet. Check back for information about joining the WedPlan marketplace."
            eyebrow="For wedding vendors"
            title="Bring your wedding business to WedPlan"
        />
    );
}
