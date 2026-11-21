"use client";

import { Button, ToastProvider } from "@heroui/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { authenticatedApiRequest } from "@/lib/authenticated-api";

interface CustomerStats {
  totalBookingRequests: number;
  pendingBookings: number;
  acceptedBookings: number;
  rejectedBookings: number;
}

interface StatsResponse {
  success: boolean;
  stats: CustomerStats;
}

const cardClassName =
  "overflow-hidden rounded-3xl border border-border bg-surface shadow-soft";

const statValueClassName =
  "mt-1 font-heading text-4xl font-medium text-foreground sm:text-5xl";

const statLabelClassName =
  "mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary";

const statDescriptionClassName =
  "text-sm leading-7 text-muted sm:text-base";

export default function CustomerDashboardPage() {
  const router = useRouter();
  const {
    data: sessionData,
    isPending: isSessionPending,
    error: sessionError,
  } = authClient.useSession();
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await authenticatedApiRequest(
        "/api/customer/dashboard/stats",
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

  const statsCards = [
    {
      label: "Total Booking Requests",
      value: stats?.totalBookingRequests ?? 0,
      href: "/customer/bookings",
      actionLabel: "View My Bookings",
    },
    {
      label: "Pending Bookings",
      value: stats?.pendingBookings ?? 0,
      href: "/customer/bookings",
      actionLabel: "View My Bookings",
    },
    {
      label: "Accepted Bookings",
      value: stats?.acceptedBookings ?? 0,
      href: "/customer/bookings",
      actionLabel: "View My Bookings",
    },
    {
      label: "Rejected Bookings",
      value: stats?.rejectedBookings ?? 0,
      href: "/customer/bookings",
      actionLabel: "View My Bookings",
    },
  ];

  return (
    <>
      <section className="rounded-3xl border border-border bg-surface p-8 shadow-soft sm:p-12">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Customer workspace
        </p>
        <h1 className="font-heading text-4xl font-medium leading-tight text-foreground sm:text-5xl">
          Overview
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
          Welcome to your customer dashboard. Use the sidebar to view your
          bookings or update your profile.
        </p>
      </section>

      {isLoading ? (
        <section className="space-y-5" role="status" aria-busy="true">
          {statsCards.map((_, index) => (
            <div
              key={index}
              className={`${cardClassName} h-32 flex items-center px-8 py-6`}
            >
              <div className="h-52 animate-pulse rounded-3xl bg-surface-secondary" />
              <div className="ml-6 space-y-2">
                <div className="h-4 animate-pulse rounded-full bg-surface-secondary" />
                <div className="h-4 animate-pulse rounded-full bg-surface-secondary w-3/4" />
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
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((card) => (
            <Link
              key={card.label}
              className={cardClassName}
              href={card.href}
            >
              <div className="p-8">
                <p className={statLabelClassName}>{card.label}</p>
                <p className={statValueClassName}>{card.value}</p>
                <p className={statDescriptionClassName}>
                  {stats === null ? "–" : ""}
                </p>
              </div>
              <div className="border-t border-border pt-6 px-8">
                <Button
                  className="w-full"
                  onPress={() => router.push(card.href)}
                  variant="outline"
                  size="sm"
                >
                  {card.actionLabel}
                </Button>
              </div>
            </Link>
          ))}
        </section>
      )}

      <ToastProvider placement="top end" />
    </>
  );
}
