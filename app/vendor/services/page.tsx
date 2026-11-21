import type { Metadata } from "next";
import { MyServices } from "./MyServices";

export const metadata: Metadata = {
    title: "My Services",
    description: "Manage your wedding service listings on WedPlan.",
};

export default function MyServicesPage() {
    return <MyServices />;
}
