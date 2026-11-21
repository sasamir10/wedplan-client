import type { Metadata } from "next";
import { AdminServices } from "./AdminServices";

export const metadata: Metadata = {
    title: "Manage Services",
    description: "Review and manage WedPlan wedding service listings.",
};

export default function AdminServicesPage() {
    return <AdminServices />;
}
