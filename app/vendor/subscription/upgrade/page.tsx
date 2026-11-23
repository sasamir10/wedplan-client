"use client";

import { Button } from "@heroui/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { authenticatedApiRequest } from "@/lib/authenticated-api";

interface CheckoutResponse {
  success: boolean;
  checkoutUrl: string;
  sessionId: string;
}

const cardClassName =
  "overflow-hidden rounded-3xl border border-border bg-surface shadow-soft";

const statLabelClassName =
  "mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary";

const statValueClassName =
  "mt-1 font-heading text-4xl font-medium text-foreground sm:text-5xl";

export default function VendorSubscriptionUpgradePage() {
  const router = useRouter();
  const {
    data: sessionData,
    isPending: isSessionPending,
    error: sessionError,
  } = authClient.useSession();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isPremium = sessionData?.user?.subscriptionPlan === "premium";

  const handleUpgrade = useCallback(async () => {
    if (isPremium || isCheckingOut) {
      return;
    }

    setIsCheckingOut(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await authenticatedApiRequest(
        "/api/vendor/subscription/checkout",
        { method: "POST" },
      );

      if (response.status === 409) {
        setSuccessMessage(
          "You are already on the Premium plan. No changes were made.",
        );
        return;
      }

      if (response.status === 403) {
        router.replace("/");
        return;
      }

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to start checkout. Please try again.");
      }

      const payload: unknown = await response.json();
      const result = payload as CheckoutResponse;

      if (!result.success || !result.checkoutUrl) {
        throw new Error("Invalid response from server.");
      }

      // Redirect to external Stripe Checkout URL.
      window.location.href = result.checkoutUrl;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't start checkout. Please try again.",
      );
    } finally {
      setIsCheckingOut(false);
    }
  }, [isPremium, isCheckingOut, router]);

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
          <p className={statLabelClassName}>Subscription</p>
          <h1 className="font-heading text-4xl font-medium leading-tight text-foreground sm:text-5xl">
            Upgrade to Premium
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
            Unlock unlimited active services with a recurring monthly
            subscription. Premium activation is verified exclusively by the
            backend after a successful Stripe payment.
          </p>
        </div>
      </section>

      {successMessage && (
        <section
          className="rounded-3xl border border-success/40 bg-success/10 p-6 text-sm text-success"
          role="status"
        >
          {successMessage}
        </section>
      )}

      {errorMessage && (
        <section
          className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive"
          role="alert"
        >
          {errorMessage}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Free Plan */}
        <section className={cardClassName}>
          <div className="p-8">
            <p className={statLabelClassName}>Current Plan</p>
            <p className="mt-1 font-heading text-3xl font-medium text-foreground">
              Free
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              Up to 3 active services included at no cost.
            </p>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Included
              </p>
              <ul className="mt-3 space-y-2 text-sm text-foreground">
                <li className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1 size-1.5 rounded-full bg-primary" />
                  <span>Up to 3 active services</span>
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1 size-1.5 rounded-full bg-primary" />
                  <span>Service listing and booking requests</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Premium Plan */}
        <section className={`${cardClassName} border-primary/40`}>
          <div className="p-8">
            <p className={statLabelClassName}>Premium Plan</p>
            <p className="mt-1 font-heading text-3xl font-medium text-foreground">
              $9.99 USD
              <span className="ml-2 text-base font-normal text-muted">
                / month
              </span>
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              Recurring monthly subscription. Cancel anytime.
            </p>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                Included
              </p>
              <ul className="mt-3 space-y-2 text-sm text-foreground">
                <li className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1 size-1.5 rounded-full bg-primary" />
                  <span>Unlimited active services</span>
                </li>
                <li className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1 size-1.5 rounded-full bg-primary" />
                  <span>Service listing and booking requests</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              {isPremium ? (
                <Button
                  className="w-full"
                  variant="secondary"
                  isDisabled
                  size="lg"
                >
                  Current Plan
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant="primary"
                  onPress={handleUpgrade}
                  isDisabled={isCheckingOut}
                  size="lg"
                >
                  {isCheckingOut ? "Redirecting to checkout…" : "Upgrade to Premium"}
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>

      <p className="text-center text-xs text-muted">
        Payment is processed by Stripe. You will be redirected to Stripe
        Checkout to complete your purchase. A successful redirect or return
        from Stripe is not proof of payment — Premium activation is verified
        exclusively by the backend webhook.
      </p>

      <div className="flex justify-center">
        <Link
          href="/vendor"
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}