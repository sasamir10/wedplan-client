import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Vendor Dashboard",
    description: "Manage your services and booking requests on WedPlan.",
};

export default function VendorDashboardPage() {
    return (
        <section className="rounded-3xl border border-border bg-surface p-8 shadow-soft sm:p-12">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Vendor workspace
            </p>
            <h1 className="font-heading text-4xl font-medium leading-tight text-foreground sm:text-5xl">
                Overview
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                Welcome to your vendor dashboard. Use the sidebar to manage
                your services, review booking requests, or update your
                profile.
            </p>
        </section>
    );
}
