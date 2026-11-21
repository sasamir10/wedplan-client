import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";

export default function VendorDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardLayout role="vendor">{children}</DashboardLayout>;
}
