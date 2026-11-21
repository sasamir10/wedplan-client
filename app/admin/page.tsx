import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Admin Dashboard",
    description: "Manage users, services, and transactions on WedPlan.",
};

export default function AdminDashboardPage() {
    return (
        <section className="rounded-3xl border border-border bg-surface p-8 shadow-soft sm:p-12">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Admin workspace
            </p>
            <h1 className="font-heading text-4xl font-medium leading-tight text-foreground sm:text-5xl">
                Overview
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                Welcome to your admin dashboard. Use the sidebar to manage
                services or view platform users.
            </p>
        </section>
    );
}
