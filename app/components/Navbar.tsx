"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, ToastProvider, toast } from "@heroui/react";
import { authClient } from "@/lib/auth-client";
import { dashboardPathForRole, isWedPlanRole } from "@/lib/auth-navigation";

const publicNavigationLinks = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Browse Services" },
    { href: "/how-it-works", label: "How It Works" },
];

const customerNavigationLinks = [
    { href: "/customer/bookings", label: "My Bookings" },
];

const vendorNavigationLinks = [
    { href: "/vendor/bookings", label: "Booking Requests" },
];

function navigationLinkClassName(isActive: boolean): string {
    return [
        "rounded-full px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-surface-secondary hover:text-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        isActive ? "text-primary" : "text-foreground/75",
    ].join(" ");
}

export function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const {
        data: sessionData,
        isPending: isSessionPending,
        error: sessionError,
        refetch: refetchSession,
    } = authClient.useSession();
    const role =
        !isSessionPending && !sessionError ? sessionData?.user?.role : undefined;
    const isAuthenticated =
        Boolean(sessionData?.user) && !isSessionPending && !sessionError;
    const dashboardHref = isWedPlanRole(role) ? dashboardPathForRole(role) : null;

    useEffect(() => {
        if (!isMobileMenuOpen) {
            return;
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsMobileMenuOpen(false);
                menuButtonRef.current?.focus();
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isMobileMenuOpen]);

    async function handleSignOut() {
        if (isLoggingOut) {
            return;
        }

        setIsLoggingOut(true);

        try {
            const response = await authClient.signOut();

            if (response.error) {
                toast.danger("Unable to sign out. Please try again.");
                return;
            }

            toast.success("You have been signed out successfully.");
            router.replace("/");
        } catch {
            toast.danger("Unable to sign out. Please try again.");
        } finally {
            setIsLoggingOut(false);
            setIsMobileMenuOpen(false);
        }
    }

    function renderNavigationLinks(mobile = false) {
        const roleLinks =
            role === "customer"
                ? customerNavigationLinks
                : role === "vendor"
                  ? vendorNavigationLinks
                  : [];

        return [...publicNavigationLinks, ...roleLinks].map(
            ({ href, label }) => {
                const isActive = pathname === href;

                return (
                    <Link
                        aria-current={isActive ? "page" : undefined}
                        className={navigationLinkClassName(isActive)}
                        href={href}
                        key={href}
                        onClick={
                            mobile ? () => setIsMobileMenuOpen(false) : undefined
                        }
                    >
                        {label}
                    </Link>
                );
            }
        );
    }

    const actionLinkClassName =
        "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
            <div className="page-shell flex h-20 items-center justify-between gap-6">
                <Link
                    aria-label="WedPlan home"
                    className="group inline-flex shrink-0 items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                    href="/"
                >
                    <span
                        aria-hidden="true"
                        className="grid size-10 place-items-center rounded-full border border-secondary text-xl text-primary"
                    >
                        <span className="font-heading">W</span>
                    </span>
                    <span className="font-heading text-3xl font-semibold tracking-tight text-foreground">
                        WedPlan
                    </span>
                </Link>

                <nav
                    aria-label="Main navigation"
                    className="hidden items-center gap-1 lg:flex"
                >
                    {renderNavigationLinks()}
                </nav>

                <div className="hidden shrink-0 items-center gap-3 lg:flex">
                    {isSessionPending ? (
                        <span className="text-sm text-muted" role="status">
                            Checking session…
                        </span>
                    ) : sessionError ? (
                        <Button
                            onClick={() => void refetchSession()}
                            size="sm"
                            variant="outline"
                            className={actionLinkClassName}
                        >
                            Retry session
                        </Button>
                    ) : isAuthenticated ? (
                        <>
                            {dashboardHref && (
                                <Link
                                    className={`${actionLinkClassName} text-foreground hover:bg-surface-secondary`}
                                    href={dashboardHref}
                                >
                                    Dashboard
                                </Link>
                            )}
                            <span className="hidden max-w-44 truncate text-sm text-muted xl:block" title={sessionData?.user.email}>
                                {sessionData?.user.name || sessionData?.user.email}
                            </span>
                        <Button
                            onClick={handleSignOut}
                            isDisabled={isLoggingOut}
                            isPending={isLoggingOut}
                            size="sm"
                            variant="outline"
                            className={actionLinkClassName}
                        >
                            {isLoggingOut ? "Signing out…" : "Logout"}
                        </Button>
                        </>
                    ) : (
                        <>
                            <Link
                                className={`${actionLinkClassName} text-foreground hover:bg-surface-secondary`}
                                href="/sign-in"
                            >
                                Sign In
                            </Link>
                            <Link
                                className={`${actionLinkClassName} bg-primary text-primary-foreground shadow-soft hover:bg-accent/90`}
                                href="/get-started"
                            >
                                Get Started
                            </Link>
                        </>
                    )}
                </div>

                <button
                    aria-controls="mobile-site-navigation"
                    aria-expanded={isMobileMenuOpen}
                    aria-label={
                        isMobileMenuOpen
                            ? "Close navigation menu"
                            : "Open navigation menu"
                    }
                    className="grid size-11 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus lg:hidden"
                    onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
                    ref={menuButtonRef}
                    type="button"
                >
                    <svg
                        aria-hidden="true"
                        className="size-5"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        {isMobileMenuOpen ? (
                            <path
                                d="m6 6 12 12M18 6 6 18"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeWidth="1.8"
                            />
                        ) : (
                            <path
                                d="M4 7h16M4 12h16M4 17h16"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeWidth="1.8"
                            />
                        )}
                    </svg>
                </button>
            </div>

            <ToastProvider placement="top end" />

            <div
                className={`${isMobileMenuOpen ? "block" : "hidden"} border-t border-border bg-background lg:hidden`}
                id="mobile-site-navigation"
            >
                <nav
                    aria-label="Mobile navigation"
                    className="page-shell flex flex-col gap-2 py-5"
                >
                    {renderNavigationLinks(true)}
                    <div className="mt-2 grid grid-cols-2 gap-3 border-t border-border pt-4">
                        {isSessionPending ? (
                            <span className="col-span-2 py-2 text-center text-sm text-muted" role="status">
                                Checking session…
                            </span>
                        ) : sessionError ? (
                            <Button
                                onClick={() => void refetchSession()}
                                variant="outline"
                                className={`${actionLinkClassName} col-span-2`}
                            >
                                Retry session
                            </Button>
                        ) : isAuthenticated ? (
                            <>
                                {dashboardHref && (
                                    <Link
                                        className={`${actionLinkClassName} border border-border text-foreground hover:bg-surface-secondary col-span-2`}
                                        href={dashboardHref}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Dashboard
                                    </Link>
                                )}
                            <button
                                onClick={handleSignOut}
                                disabled={isLoggingOut}
                                className={`${actionLinkClassName} border border-border text-foreground hover:bg-surface-secondary col-span-2`}
                            >
                                {isLoggingOut ? "Signing out…" : "Logout"}
                            </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    className={`${actionLinkClassName} border border-border text-foreground hover:bg-surface-secondary`}
                                    href="/sign-in"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Sign In
                                </Link>
                                <Link
                                    className={`${actionLinkClassName} bg-primary text-primary-foreground shadow-soft hover:bg-accent/90`}
                                    href="/get-started"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>
                </nav>
            </div>
        </header>
    );
}
