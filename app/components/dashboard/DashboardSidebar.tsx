"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface DashboardSidebarProps {
    role: "customer" | "vendor" | "admin";
    isMobileMenuOpen: boolean;
    onToggleMobileMenu: () => void;
}

const customerNavigationLinks = [
    { href: "/customer", label: "Overview" },
    { href: "/customer/bookings", label: "My Bookings" },
    { href: "/customer/profile", label: "Profile Settings" },
];

const vendorNavigationLinks = [
    { href: "/vendor", label: "Overview" },
    { href: "/vendor/services", label: "My Services" },
    { href: "/vendor/services/new", label: "Add Service" },
    { href: "/vendor/bookings", label: "Booking Requests" },
    { href: "/vendor/profile", label: "Profile Settings" },
];

const adminNavigationLinks = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/services", label: "Manage Services" },
];

function dashboardLinkClassName(isActive: boolean): string {
    return [
        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
        isActive
            ? "bg-primary text-primary-foreground"
            : "text-foreground/75 hover:bg-surface-secondary hover:text-primary",
    ].join(" ");
}

export function DashboardSidebar({
    role,
    isMobileMenuOpen,
    onToggleMobileMenu,
}: DashboardSidebarProps) {
    const pathname = usePathname();

    const links =
        role === "customer"
            ? customerNavigationLinks
            : role === "vendor"
                ? vendorNavigationLinks
                : adminNavigationLinks;

    const handleLinkClick = () => {
        if (typeof window !== "undefined" && window.innerWidth < 1024) {
            onToggleMobileMenu();
        }
    };

    return (
            <aside
                aria-label="Dashboard navigation"
                className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-border bg-surface transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:relative lg:static lg:inset-0 lg:auto lg:border-0 lg:flex lg:flex-col`}
            >
            <div className="flex h-full flex-col lg:flex-1">
                <div className="flex h-16 items-center justify-between gap-6 border-b border-border bg-surface px-5">
                    <Link
                        aria-label="WedPlan home"
                        className="group inline-flex shrink-0 items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                        href="/"
                    >
                        <span
                            aria-hidden="true"
                            className="grid size-8 place-items-center rounded-full border border-secondary text-lg text-primary"
                        >
                            <span className="font-heading">W</span>
                        </span>
                        <span className="font-heading text-xl font-semibold tracking-tight text-foreground">
                            WedPlan
                        </span>
                    </Link>
                    <button
                        aria-label="Close navigation menu"
                        className="lg:hidden size-8 rounded-full border border-border text-foreground hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        onClick={onToggleMobileMenu}
                    >
                        <svg
                            aria-hidden="true"
                            className="size-5"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <nav className="flex-1 px-4 py-5 space-y-1">
                    {links.map(({ href, label }) => {
                        const isActive = pathname === href;
                        return (
                            <Link
                                key={href}
                                aria-current={isActive ? "page" : undefined}
                                className={dashboardLinkClassName(isActive)}
                                href={href}
                                onClick={handleLinkClick}
                            >
                                {label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-border px-4 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                        {role.charAt(0).toUpperCase() + role.slice(1)} workspace
                    </p>
                </div>
            </div>
        </aside>
    );
}

export function DashboardMobileOverlay({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    if (!isOpen) {
        return null;
    }

    return (
        <div
            aria-hidden="true"
            className="fixed inset-0 z-30 bg-charcoal/40 backdrop-blur-sm lg:hidden"
            onClick={onClose}
        />
    );
}

export function DashboardMobileMenuButton({
    isOpen,
    onToggle,
}: {
    isOpen: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isOpen}
            className="grid size-11 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus lg:hidden"
            onClick={onToggle}
            type="button"
        >
            <svg
                aria-hidden="true"
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
            >
                {isOpen ? (
                    <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        d="m6 6 12 12M18 6 6 18"
                    />
                ) : (
                    <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                        d="M4 7h16M4 12h16M4 17h16"
                    />
                )}
            </svg>
        </button>
    );
}
