import type { Metadata } from "next";
import { AddServiceForm } from "./AddServiceForm";

export const metadata: Metadata = {
    title: "Add a Service",
    description: "Share your wedding service with couples on WedPlan.",
};

export default function AddServicePage() {
    return <AddServiceForm />;
}
