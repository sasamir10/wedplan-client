import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";

export default function CustomerDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardLayout role="customer">{children}</DashboardLayout>;
}
