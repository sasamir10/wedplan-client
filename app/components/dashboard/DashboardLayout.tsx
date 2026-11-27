"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { authClient } from "@/lib/auth-client";
import {
    DashboardSidebar,
    DashboardMobileMenuButton,
    DashboardMobileOverlay,
} from "./DashboardSidebar";

interface DashboardLayoutProps {
    children: React.ReactNode;
    role: "customer" | "vendor" | "admin";
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
    const router = useRouter();
    const {
        data: sessionData,
        isPending: isSessionPending,
        error: sessionError,
        refetch: refetchSession,
    } = authClient.useSession();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (isSessionPending || sessionError) {
            return;
        }

        if (!sessionData?.user) {
            router.replace("/sign-in");
            return;
        }

        if (sessionData.user.role !== role) {
            router.replace("/");
            return;
        }

        if (sessionData.user.isBlocked) {
            router.replace("/");
            return;
        }
    }, [isSessionPending, sessionData, sessionError, role, router]);

    if (isSessionPending) {
        return (
            <div className="page-shell flex min-h-[60vh] items-center justify-center py-16">
                <p className="text-sm text-muted" role="status">
                    Checking your session…
                </p>
            </div>
        );
    }

    if (sessionError) {
        return (
            <div className="page-shell flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16">
                <p className="text-sm text-muted" role="alert">
                    We couldn’t verify your session. Your dashboard is hidden until it can be checked.
                </p>
                <Button onClick={() => void refetchSession()} variant="outline">
                    Try again
                </Button>
            </div>
        );
    }

    if (!sessionData?.user) {
        return (
            <div className="page-shell flex min-h-[60vh] items-center justify-center py-16">
                <p className="text-sm text-muted" role="status">
                    Redirecting to sign in…
                </p>
            </div>
        );
    }

    if (sessionData.user.role !== role || sessionData.user.isBlocked) {
        return (
            <div className="page-shell flex min-h-[60vh] items-center justify-center py-16">
                <p className="text-sm text-muted" role="status">
                    Redirecting to a public page…
                </p>
            </div>
        );
    }

    const userLabel =
        sessionData.user.role.charAt(0).toUpperCase() +
        sessionData.user.role.slice(1);

    return (
        <div className="flex h-full w-full">
            <DashboardSidebar
                role={role}
                isMobileMenuOpen={isMobileMenuOpen}
                onToggleMobileMenu={() =>
                    setIsMobileMenuOpen((open) => !open)
                }
            />
            <DashboardMobileOverlay
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            <div className="flex-1 flex flex-col">
                <header className="flex h-16 items-center justify-between border-b border-border bg-surface/95 backdrop-blur-md px-5 lg:px-0">
                    <DashboardMobileMenuButton
                        isOpen={isMobileMenuOpen}
                        onToggle={() =>
                            setIsMobileMenuOpen((open) => !open)
                        }
                    />
                    <div className="flex items-center gap-4 text-sm">
                        <p className="font-medium text-foreground">
                            {userLabel} workspace
                        </p>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto page-shell py-10 sm:py-14 lg:py-16">
                    {children}
                </main>
            </div>
        </div>
    );
}
