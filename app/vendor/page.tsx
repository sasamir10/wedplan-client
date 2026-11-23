"use client";

import { Button, ToastProvider } from "@heroui/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { authenticatedApiRequest } from "@/lib/authenticated-api";

interface VendorStats {
  totalServices: number;
  activeServices: number;
  pendingBookingRequests: number;
  acceptedBookings: number;
  subscriptionPlan: string;
}

interface StatsResponse {
  success: boolean;
  stats: VendorStats;
}

const cardClassName =
  "overflow-hidden rounded-3xl border border-border bg-surface shadow-soft";

const statValueClassName =
  "mt-1 font-heading text-4xl font-medium text-foreground sm:text-5xl";

const statLabelClassName =
  "mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary";

const statDescriptionClassName =
  "text-sm leading-7 text-muted sm:text-base";

function planLabel(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export default function VendorDashboardPage() {
  const router = useRouter();
  const {
    data: sessionData,
    isPending: isSessionPending,
    error: sessionError,
  } = authClient.useSession();
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await authenticatedApiRequest(
        "/api/vendor/dashboard/stats",
        { method: "GET" },
      );

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/sign-in");
          return;
        }
        throw new Error("Unable to load dashboard statistics");
      }

      const payload: unknown = await response.json();
      const result: StatsResponse = payload as StatsResponse;
      setStats(result.stats);
    } catch {
      setLoadError(
        "We couldn't load your dashboard statistics. Check your connection and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (isSessionPending || sessionError || !sessionData?.user) {
      return;
    }

    const startRequest = window.setTimeout(() => {
      void loadStats();
    }, 0);
    return () => {
      window.clearTimeout(startRequest);
    };
  }, [isSessionPending, sessionData?.user, sessionError, loadStats]);

  function retry() {
    void loadStats();
  }

  if (isSessionPending) {
    return (
      <div className="page-shell flex min-h-[60vh] items-center justify-center py-16">
        <p className="text-sm text-muted" role="status">
          Checking your session…
        </p>
      </div>
    );
  }

  if (sessionError || !sessionData?.user) {
    return (
      <div className="page-shell flex min-h-[60vh] items-center justify-center py-16">
        <p className="text-sm text-muted" role="status">
          Redirecting to sign in…
        </p>
      </div>
    );
  }

  const statsCards = [
    {
      label: "Total Services",
      value: stats?.totalServices ?? 0,
      href: "/vendor/services",
      actionLabel: "View My Services",
    },
    {
      label: "Active Services",
      value: stats?.activeServices ?? 0,
      href: "/vendor/services",
      actionLabel: "Manage Services",
    },
    {
      label: "Pending Booking Requests",
      value: stats?.pendingBookingRequests ?? 0,
      href: "/vendor/bookings",
      actionLabel: "View Requests",
    },
    {
      label: "Accepted Bookings",
      value: stats?.acceptedBookings ?? 0,
      href: "/vendor/bookings",
      actionLabel: "View Requests",
    },
    {
      label: "Subscription Plan",
      value: 0,
      displayValue: planLabel(stats?.subscriptionPlan ?? "Free"),
      href: "/vendor/services",
      actionLabel: "Manage Services",
    },
  ];

  return (
    <>
      <section className="rounded-3xl border border-border bg-surface p-8 shadow-soft sm:p-12">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Vendor workspace
        </p>
        <h1 className="font-heading text-4xl font-medium leading-tight text-foreground sm:text-5xl">
          Overview
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
          Welcome to your vendor dashboard. Use the sidebar to manage your
          services, review booking requests, or update your profile.
        </p>
      </section>

      {isLoading ? (
        <section
          className={`
            grid
            gap-4
            sm:grid-cols-2
            sm:gap-6
            lg:grid-cols-6
            lg:gap-6
          `}
          role="status"
          aria-busy="true"
        >
          {statsCards.map((_, index) => (
            <div
              key={index}
              className={`${cardClassName} flex flex-col h-full p-6`}
            >
              <div className="h-4 animate-pulse rounded-full bg-surface-secondary" />
              <div className="mt-2 h-10 animate-pulse rounded-full bg-surface-secondary w-3/4" />
              <div className="mt-auto border-t border-border pt-4">
                <div className="h-9 w-24 animate-pulse rounded-full bg-surface-secondary" />
              </div>
            </div>
          ))}
        </section>
      ) : loadError ? (
        <section className="rounded-3xl border border-border bg-surface p-8 text-center shadow-soft">
          <h2 className="font-heading text-3xl text-foreground">
            Dashboard statistics couldn’t load
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">{loadError}</p>
          <Button className="mt-6" onPress={retry} variant="primary">
            Try again
          </Button>
        </section>
      ) : (
        <section
          className={`
            grid
            gap-4
            sm:grid-cols-2
            sm:gap-6
            lg:grid-cols-6
            lg:gap-6
          `}
        >
          {statsCards.map((card, index) => {
            const isSubscription = card.label === "Subscription Plan";

            // Desktop: each card spans 2 columns.
            // Row 1 (cards 0-2) auto-fills; Row 2 (cards 3-4) centered
            // via explicit column starts in the 6-column grid.
            let columnStart = "";
            if (index === 3) columnStart = "lg:col-start-2";
            if (index === 4) columnStart = "lg:col-start-4";

            const cardClasses = [
              cardClassName,
              "flex flex-col h-full p-6",
              "lg:col-span-2",
              columnStart,
            ]
              .filter(Boolean)
              .join(" ");

            if (isSubscription) {
              return (
                <section key={card.label} className={cardClasses}>
                  <p className={statLabelClassName}>{card.label}</p>
                  <p className={`${statValueClassName} mt-1 text-primary font-semibold`}>
                    {card.displayValue}
                  </p>
                  <p className="mt-1 text-xs text-muted">Current plan</p>
                </section>
              );
            }

            return (
              <Link
                key={card.label}
                className={cardClasses}
                href={card.href}
              >
                <div className="flex flex-col h-full">
                  <p className={statLabelClassName}>{card.label}</p>
                  <p className={`${statValueClassName} mt-1`}>{card.value}</p>
                  <div className="mt-auto border-t border-border pt-4">
                    <Button
                      className="w-full"
                      onPress={() => router.push(card.href)}
                      variant="outline"
                      size="sm"
                    >
                      {card.actionLabel}
                    </Button>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <ToastProvider placement="top end" />
    </>
  );
}
