"use client";

import { AlertDialog, Button, ToastProvider, toast } from "@heroui/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { authenticatedApiRequest } from "@/lib/authenticated-api";

interface VendorSubscription {
  subscriptionPlan: string;
  subscriptionStatus: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
  subscriptionCurrentPeriodEnd: string | null;
  hasActiveSubscription: boolean;
}

interface StatsResponse {
  success: boolean;
  stats: VendorSubscription;
}

interface CheckoutResponse {
  success: boolean;
  checkoutUrl: string;
  sessionId: string;
}

interface CancelResponse {
  success: boolean;
  cancelled: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd?: string;
  subscriptionStatus?: string;
}

const cardClassName =
  "overflow-hidden rounded-3xl border border-border bg-surface shadow-soft";

const statLabelClassName =
  "mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary";

function formatBillingDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
}

function subscriptionStatusLabel(status: string | null): string {
  if (!status) {
    return "Active";
  }

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function VendorSubscriptionUpgradePage() {
  const router = useRouter();
  const {
    data: sessionData,
    isPending: isSessionPending,
    error: sessionError,
  } = authClient.useSession();

  const [subscription, setSubscription] = useState<VendorSubscription | null>(
    null,
  );
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    setIsLoadingSubscription(true);
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
        throw new Error("Unable to load subscription details");
      }

      const payload = (await response.json()) as StatsResponse;
      setSubscription(payload.stats);
    } catch {
      setLoadError(
        "We couldn't load your subscription details. Check your connection and try again.",
      );
    } finally {
      setIsLoadingSubscription(false);
    }
  }, [router]);

  useEffect(() => {
    if (isSessionPending || sessionError || !sessionData?.user) {
      return;
    }

    const startRequest = window.setTimeout(() => {
      void loadSubscription();
    }, 0);

    return () => {
      window.clearTimeout(startRequest);
    };
  }, [isSessionPending, sessionData?.user, sessionError, loadSubscription]);

  const isPremium =
    (subscription?.subscriptionPlan ??
      sessionData?.user?.subscriptionPlan ??
      "free") === "premium";

  const cancelScheduled =
    subscription?.subscriptionCancelAtPeriodEnd === true;

  const billingPeriodEnd = formatBillingDate(
    subscription?.subscriptionCurrentPeriodEnd ?? null,
  );

  const canCancel =
    isPremium &&
    subscription?.hasActiveSubscription === true &&
    !cancelScheduled;

  const statusLabel = cancelScheduled
    ? "Cancellation scheduled"
    : subscriptionStatusLabel(subscription?.subscriptionStatus ?? null);

  const handleUpgrade = useCallback(async () => {
    if (isPremium || isCheckingOut) {
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError(null);
    setNotice(null);

    try {
      const response = await authenticatedApiRequest(
        "/api/vendor/subscription/checkout",
        { method: "POST" },
      );

      if (response.status === 409) {
        setNotice(
          "You are already on the Premium plan. No changes were made.",
        );
        await loadSubscription();
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

      // Redirect to the external Stripe Checkout URL. Premium is activated
      // only by the verified backend webhook, never by this redirect.
      window.location.href = result.checkoutUrl;
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "We couldn't start checkout. Please try again.",
      );
    } finally {
      setIsCheckingOut(false);
    }
  }, [isPremium, isCheckingOut, loadSubscription, router]);

  const handleCancel = useCallback(async () => {
    if (isCancelling || !canCancel) {
      return;
    }

    setIsCancelling(true);
    setCancelError(null);
    setNotice(null);

    try {
      const response = await authenticatedApiRequest(
        "/api/vendor/subscription/cancel",
        { method: "POST" },
      );

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      if (response.status === 403) {
        setCancelError(
          "Your account is not eligible to manage this subscription.",
        );
        return;
      }

      if (response.status === 404) {
        setCancelError(
          "No active subscription was found. Refresh the page and try again.",
        );
        await loadSubscription();
        return;
      }

      if (response.status === 409) {
        setCancelError(
          "This subscription is not eligible for cancellation.",
        );
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to schedule cancellation.");
      }

      const payload = (await response.json()) as CancelResponse;

      if (!payload.success || !payload.cancelAtPeriodEnd) {
        throw new Error("Invalid response from server.");
      }

      setSubscription((current) =>
        current
          ? {
              ...current,
              subscriptionCancelAtPeriodEnd: true,
              subscriptionStatus:
                payload.subscriptionStatus ?? current.subscriptionStatus,
              subscriptionCurrentPeriodEnd:
                payload.currentPeriodEnd ??
                current.subscriptionCurrentPeriodEnd,
            }
          : current,
      );
      setNotice(
        "Cancellation scheduled. Premium access continues until the end of the current billing period.",
      );
      toast.success("Cancellation scheduled.");
      setIsCancelDialogOpen(false);
    } catch {
      setCancelError(
        "We couldn't schedule cancellation. Please try again.",
      );
    } finally {
      setIsCancelling(false);
    }
  }, [canCancel, isCancelling, loadSubscription, router]);

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
            {isPremium ? "Manage Subscription" : "Upgrade to Premium"}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
            {isPremium
              ? "Review your Premium plan, billing period, and cancellation status. Premium activation and downgrades are controlled exclusively by verified backend webhooks."
              : "Unlock unlimited active services with a recurring monthly subscription. Premium activation is verified exclusively by the backend after a successful Stripe payment."}
          </p>
        </div>
      </section>

      {notice && (
        <section
          className="rounded-3xl border border-success/40 bg-success/10 p-6 text-sm text-success"
          role="status"
        >
          {notice}
        </section>
      )}

      {checkoutError && (
        <section
          className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive"
          role="alert"
        >
          {checkoutError}
        </section>
      )}

      {cancelError && (
        <section
          className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive"
          role="alert"
        >
          {cancelError}
        </section>
      )}

      {isLoadingSubscription ? (
        <section className={cardClassName}>
          <div className="p-8" role="status" aria-busy="true">
            <div className="h-4 w-32 animate-pulse rounded-full bg-surface-secondary" />
            <div className="mt-4 h-10 w-48 animate-pulse rounded-full bg-surface-secondary" />
            <div className="mt-4 h-4 w-full max-w-md animate-pulse rounded-full bg-surface-secondary" />
          </div>
        </section>
      ) : loadError ? (
        <section className={`${cardClassName} p-8 text-center`}>
          <h2 className="font-heading text-3xl text-foreground">
            Subscription details couldn’t load
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">{loadError}</p>
          <Button
            className="mt-6"
            onPress={() => void loadSubscription()}
            variant="primary"
          >
            Try again
          </Button>
        </section>
      ) : isPremium ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className={`${cardClassName} border-primary/40`}>
              <div className="p-8">
                <p className={statLabelClassName}>Current Subscription</p>
                <p className="mt-1 font-heading text-3xl font-medium text-foreground">
                  Premium
                  <span className="ml-2 text-base font-normal text-muted">
                    $9.99 USD / month
                  </span>
                </p>

                <dl className="mt-6 space-y-4 text-sm">
                  <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
                    <dt className="text-muted">Status</dt>
                    <dd className="text-right font-medium text-foreground">
                      {statusLabel}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
                    <dt className="text-muted">
                      {cancelScheduled
                        ? "Premium access ends"
                        : "Current period ends"}
                    </dt>
                    <dd className="text-right font-medium text-foreground">
                      {billingPeriodEnd ?? "Not available yet"}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
                    <dt className="text-muted">Cancellation</dt>
                    <dd className="text-right font-medium text-foreground">
                      {cancelScheduled ? "Scheduled" : "Not scheduled"}
                    </dd>
                  </div>
                </dl>

                {cancelScheduled ? (
                  <p className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm leading-6 text-muted">
                    Your subscription is scheduled to cancel at the end of the
                    current billing period. Premium access continues until then.
                    No further charges will be made after cancellation.
                  </p>
                ) : canCancel ? (
                  <Button
                    className="mt-6 w-full"
                    onPress={() => {
                      setCancelError(null);
                      setIsCancelDialogOpen(true);
                    }}
                    variant="outline"
                    size="lg"
                  >
                    Cancel Subscription
                  </Button>
                ) : (
                  <p className="mt-6 rounded-2xl border border-border bg-surface-secondary/60 p-4 text-sm leading-6 text-muted">
                    Subscription details are still syncing with Stripe. Refresh
                    the page in a moment if you need to manage cancellation.
                  </p>
                )}
              </div>
            </section>

            <section className={cardClassName}>
              <div className="p-8">
                <p className={statLabelClassName}>What cancellation means</p>
                <ul className="space-y-3 text-sm leading-6 text-foreground">
                  <li className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 rounded-full bg-primary"
                    />
                    <span>
                      Your Premium benefits stay active until the end of the
                      current billing period.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 rounded-full bg-primary"
                    />
                    <span>
                      When the period ends, your account returns to the Free
                      plan automatically.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 rounded-full bg-primary"
                    />
                    <span>
                      Historical payment records are preserved. Existing
                      services and bookings are not deleted.
                    </span>
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </>
      ) : (
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
                    <span
                      aria-hidden="true"
                      className="mt-1 size-1.5 rounded-full bg-primary"
                    />
                    <span>Up to 3 active services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-1 size-1.5 rounded-full bg-primary"
                    />
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
                    <span
                      aria-hidden="true"
                      className="mt-1 size-1.5 rounded-full bg-primary"
                    />
                    <span>Unlimited active services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-1 size-1.5 rounded-full bg-primary"
                    />
                    <span>Service listing and booking requests</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8">
                <Button
                  className="w-full"
                  variant="primary"
                  onPress={handleUpgrade}
                  isDisabled={isCheckingOut}
                  size="lg"
                >
                  {isCheckingOut
                    ? "Redirecting to checkout…"
                    : "Upgrade to Premium"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      <p className="text-center text-xs text-muted">
        Payment is processed by Stripe. You will be redirected to Stripe
        Checkout to complete your purchase. A successful redirect or return
        from Stripe is not proof of payment — Premium activation and
        downgrades are verified exclusively by the backend webhook.
      </p>

      <div className="flex justify-center">
        <Link
          href="/vendor"
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to Dashboard
        </Link>
      </div>

      <AlertDialog
        isOpen={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
      >
        <AlertDialog.Backdrop
          className="bg-charcoal/45 backdrop-blur-sm"
          isDismissable
        >
          <AlertDialog.Container>
            <AlertDialog.Dialog className="rounded-2xl border border-border bg-surface p-6 shadow-card">
              <AlertDialog.Header>
                <AlertDialog.Heading className="font-heading text-3xl text-foreground">
                  Cancel Premium Subscription?
                </AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body className="mt-3 text-sm leading-6 text-muted">
                Your subscription will remain active until{" "}
                {billingPeriodEnd ?? "the end of the current billing period"}.
                After that, your account will return to the Free plan and you
                will not be charged again. This action schedules cancellation;
                it does not remove Premium access immediately.
              </AlertDialog.Body>
              <AlertDialog.Footer className="mt-6 flex justify-end gap-3">
                <Button
                  isDisabled={isCancelling}
                  onPress={() => setIsCancelDialogOpen(false)}
                  variant="outline"
                >
                  Keep Premium
                </Button>
                <Button
                  isDisabled={isCancelling}
                  isPending={isCancelling}
                  onPress={() => void handleCancel()}
                  variant="danger"
                >
                  {isCancelling ? "Scheduling…" : "Schedule Cancellation"}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      <ToastProvider placement="top end" />
    </div>
  );
}
