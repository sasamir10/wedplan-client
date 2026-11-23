"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const cardClassName =
  "overflow-hidden rounded-3xl border border-border bg-surface shadow-soft";

const statLabelClassName =
  "mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary";

export default function VendorSubscriptionCancelPage() {
  const router = useRouter();
  const {
    data: sessionData,
    isPending: isSessionPending,
    error: sessionError,
  } = authClient.useSession();

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

  return (
    <div className="space-y-8">
      <section className={cardClassName}>
        <div className="p-8 sm:p-12">
          <p className={statLabelClassName}>Checkout</p>
          <h1 className="font-heading text-4xl font-medium leading-tight text-foreground sm:text-5xl">
            Checkout cancelled
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
            You returned to WedPlan without completing your Stripe payment. No
            new Premium activation occurred through this cancelled checkout,
            and your existing Free subscription remains unchanged.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <section className={cardClassName}>
          <div className="p-8">
            <p className={statLabelClassName}>What happened</p>
            <p className="mt-1 text-sm leading-7 text-muted">
              The Stripe Checkout Session was closed before payment was
              completed. No charges were made and no subscription was created.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                className="w-full sm:w-auto"
                variant="primary"
                onPress={() =>
                  router.push("/vendor/subscription/upgrade")
                }
              >
                Try Again
              </Button>
              <Button
                className="w-full sm:w-auto"
                variant="outline"
                onPress={() => router.push("/vendor")}
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </section>

        <section className={`${cardClassName} border-border`}>
          <div className="p-8">
            <p className={statLabelClassName}>Current Plan</p>
            <p className="mt-1 font-heading text-3xl font-medium text-foreground">
              Free
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              Your subscription remains on the Free plan. You can upgrade at
              any time by visiting the Premium Upgrade page.
            </p>
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