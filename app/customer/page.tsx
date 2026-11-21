import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Customer Dashboard",
    description: "Manage your bookings and profile on WedPlan.",
};

export default function CustomerDashboardPage() {
    return (
        <section className="rounded-3xl border border-border bg-surface p-8 shadow-soft sm:p-12">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Customer workspace
            </p>
            <h1 className="font-heading text-4xl font-medium leading-tight text-foreground sm:text-5xl">
                Overview
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                Welcome to your customer dashboard. Use the sidebar to
                view your bookings or update your profile.
            </p>
        </section>
    );
}
