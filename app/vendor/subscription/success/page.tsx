"use client";

import { Button } from "@heroui/react";
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

const statLabelClassName =
  "mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary";

const statValueClassName =
  "mt-1 font-heading text-4xl font-medium text-foreground sm:text-5xl";

export default function VendorSubscriptionSuccessPage() {
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

  const isPremium = (stats?.subscriptionPlan ?? "free") === "premium";

  return (
    <div className="space-y-8">
      <section className={cardClassName}>
        <div className="p-8 sm:p-12">
          <p className={statLabelClassName}>Checkout</p>
          <h1 className="font-heading text-4xl font-medium leading-tight text-foreground sm:text-5xl">
            Thank you for completing checkout
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
            Stripe has returned you to WedPlan. Your payment is being
            confirmed by the server. Premium activation is controlled
            exclusively by the verified Stripe webhook and may take a short
            time to complete.
          </p>
        </div>
      </section>

      {loadError && (
        <section
          className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive"
          role="alert"
        >
          {loadError}
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <section className={cardClassName}>
          <div className="p-8">
            <p className={statLabelClassName}>Current Status</p>
            {isLoading ? (
              <p className="mt-1 text-sm text-muted">Checking your subscription…</p>
            ) : isPremium ? (
              <>
                <p className="mt-1 font-heading text-3xl font-medium text-foreground">
                  Premium
                </p>
                <p className="mt-2 text-sm leading-7 text-muted">
                  Your Premium subscription is now active.
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 font-heading text-3xl font-medium text-foreground">
                  Free
                </p>
                <p className="mt-2 text-sm leading-7 text-muted">
                  Your subscription is still on the Free plan. Payment
                  confirmation is still in progress — check back shortly.
                </p>
              </>
            )}
          </div>
        </section>

        <section className={`${cardClassName} border-primary/40`}>
          <div className="p-8">
            <p className={statLabelClassName}>Important</p>
            <p className="mt-1 text-sm leading-7 text-muted">
              Returning to this page is not proof of payment. Do not rely on
              this URL as confirmation that Premium has been activated. The
              backend webhook is the only authority for Premium activation.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                className="w-full sm:w-auto"
                variant="primary"
                onPress={() => router.push("/vendor")}
              >
                Return to Dashboard
              </Button>
              <Button
                className="w-full sm:w-auto"
                variant="outline"
                onPress={() => router.push("/vendor/subscription/upgrade")}
              >
                View Upgrade Page
              </Button>
            </div>
          </div>
        </section>
      </section>

      <p className="text-center text-xs text-muted">
        If you believe this is an error, please contact support. Do not share
        sensitive payment information.
      </p>
    </div>
  );
}