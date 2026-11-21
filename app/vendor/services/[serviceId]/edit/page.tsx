import type { Metadata } from "next";
import { EditServiceForm } from "./EditServiceForm";

export const metadata: Metadata = {
    title: "Edit Service",
    description: "Update your wedding service listing on WedPlan.",
};

export default async function EditServicePage({
    params,
}: {
    params: Promise<{ serviceId: string }>;
}) {
    const { serviceId } = await params;
    return <EditServiceForm serviceId={serviceId} />;
}
