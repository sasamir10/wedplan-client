import type { Metadata } from "next";
import { ServiceDetails } from "./ServiceDetails";

export const metadata: Metadata = {
    title: "Service Details",
    description:
        "View approved wedding service details, pricing, location, and vendor information on WedPlan.",
};

export default async function ServiceDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <ServiceDetails serviceId={id} />;
}
