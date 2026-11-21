"use client";

import {
    AlertDialog,
    Button,
    ToastProvider,
    toast,
} from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { authenticatedApiRequest } from "@/lib/authenticated-api";
import {
    vendorServiceResponseEnvelopeSchema,
    vendorServicesResponseSchema,
    type VendorService,
} from "@/lib/validations/service";

function requestError(status: number, action: "delete" | "availability") {
    if (status === 401) return "Your session has expired. Please sign in again.";
    if (status === 403) return "This action is available to vendor accounts.";
    if (status === 404) return "This service could not be found. Refresh the list and try again.";
    if (status === 409 && action === "availability") {
        return "Your Free plan allows up to 3 active services. Deactivate another service or upgrade your plan before activating this one.";
    }
    return action === "delete"
        ? "We couldn't delete this service. Please try again."
        : "We couldn't update availability. Please try again.";
}

function formatDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : new Intl.DateTimeFormat(undefined, {
              dateStyle: "medium",
          }).format(date);
}

function StatusBadge({ status }: { status: VendorService["status"] }) {
    const styles = {
        Pending: "border-secondary/70 bg-secondary/25 text-foreground",
        Approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
        Rejected: "border-rose-200 bg-rose-50 text-rose-800",
    };

    return (
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}>
            {status}
        </span>
    );
}

function MyServicesContent() {
    const router = useRouter();
    const {
        data: sessionData,
        isPending: isSessionPending,
        error: sessionError,
    } = authClient.useSession();
    const [services, setServices] = useState<VendorService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [retryIndex, setRetryIndex] = useState(0);
    const [availabilityBusyId, setAvailabilityBusyId] = useState<string | null>(null);
    const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<VendorService | null>(null);
    const isVendor = sessionData?.user?.role === "vendor";

    const loadServices = useCallback(async (signal: AbortSignal) => {
        try {
            const response = await authenticatedApiRequest(
                "/api/vendor/services",
                { method: "GET", signal },
            );

            if (!response.ok) {
                throw new Error("Unable to load vendor services");
            }

            const payload: unknown = await response.json();
            const result = vendorServicesResponseSchema.safeParse(payload);
            if (!result.success) {
                throw new Error("The service list response was invalid");
            }

            setServices(result.data.services);
        } catch {
            if (!signal.aborted) {
                setLoadError(
                    "We couldn't load your services. Check your connection and try again.",
                );
            }
        } finally {
            if (!signal.aborted) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isSessionPending || sessionError || !sessionData?.user || !isVendor) {
            return;
        }

        const controller = new AbortController();
        const startRequest = window.setTimeout(() => {
            if (!controller.signal.aborted) void loadServices(controller.signal);
        }, 0);
        return () => {
            window.clearTimeout(startRequest);
            controller.abort();
        };
    }, [isSessionPending, sessionData?.user, sessionError, isVendor, retryIndex, loadServices]);

    async function toggleAvailability(service: VendorService) {
        if (availabilityBusyId) return;
        setAvailabilityBusyId(service.id);

        try {
            const response = await authenticatedApiRequest(
                `/api/vendor/services/${encodeURIComponent(service.id)}/availability`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ availability: !service.availability }),
                },
            );

            if (!response.ok) {
                toast.danger(requestError(response.status, "availability"));
                return;
            }

            const payload: unknown = await response.json();
            const result = vendorServiceResponseEnvelopeSchema.safeParse(payload);
            if (!result.success) {
                toast.danger("The server returned an invalid service update.");
                return;
            }

            setServices((current) =>
                current.map((item) =>
                    item.id === service.id ? result.data.service : item,
                ),
            );
            toast.success(
                result.data.service.availability
                    ? "Service is now active."
                    : "Service is now inactive.",
            );
        } catch {
            toast.danger("We couldn't reach WedPlan. Check your connection and try again.");
        } finally {
            setAvailabilityBusyId(null);
        }
    }

    async function deleteService() {
        const service = deleteCandidate;
        if (!service || deleteBusyId) return;

        setDeleteBusyId(service.id);
        try {
            const response = await authenticatedApiRequest(
                `/api/vendor/services/${encodeURIComponent(service.id)}`,
                { method: "DELETE" },
            );

            if (!response.ok) {
                toast.danger(requestError(response.status, "delete"));
                return;
            }

            setServices((current) => current.filter((item) => item.id !== service.id));
            setDeleteCandidate(null);
            toast.success("Service deleted.");
        } catch {
            toast.danger("We couldn't reach WedPlan. Check your connection and try again.");
        } finally {
            setDeleteBusyId(null);
        }
    }

    let content;

    if (isSessionPending) {
        content = (
            <div className="flex min-h-[55vh] items-center justify-center">
                <p className="text-sm text-muted" role="status">Checking your WedPlan session…</p>
            </div>
        );
    } else if (sessionError || !sessionData?.user || !isVendor) {
        const signedIn = Boolean(sessionData?.user);
        content = (
            <section className="mx-auto max-w-xl rounded-3xl border border-border bg-surface p-8 text-center shadow-soft sm:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Vendor workspace</p>
                <h1 className="mt-3 font-heading text-4xl text-foreground sm:text-5xl">
                    {signedIn ? "Vendor access required" : "Sign in to continue"}
                </h1>
                <p className="mt-4 leading-7 text-muted">
                    {signedIn
                        ? "This area is for vendor accounts. WedPlan verifies your account for every service request."
                        : "Sign in with your vendor account to manage your services."}
                </p>
                <Link
                    className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                    href={signedIn ? "/" : "/sign-in"}
                >
                    {signedIn ? "Return home" : "Sign in"}
                </Link>
            </section>
        );
    } else if (isLoading) {
        content = (
            <div aria-busy="true" className="space-y-5" role="status">
                <p className="text-sm text-muted">Loading your services…</p>
                <div className="h-52 animate-pulse rounded-3xl bg-surface-secondary" />
                <div className="h-52 animate-pulse rounded-3xl bg-surface-secondary" />
            </div>
        );
    } else if (loadError) {
        content = (
            <section className="rounded-3xl border border-border bg-surface p-8 text-center shadow-soft">
                <h2 className="font-heading text-3xl text-foreground">Your services couldn’t load</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{loadError}</p>
                <Button className="mt-6" onPress={() => {
                    setIsLoading(true);
                    setLoadError(null);
                    setRetryIndex((value) => value + 1);
                }} variant="primary">
                    Try again
                </Button>
            </section>
        );
    } else if (services.length === 0) {
        content = (
            <section className="rounded-3xl border border-dashed border-secondary bg-surface p-8 text-center shadow-soft sm:p-12">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Your vendor collection</p>
                <h2 className="mt-3 font-heading text-4xl text-foreground">Your first service starts here</h2>
                <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-muted">
                    Add the details and images couples need to discover what you offer.
                </p>
                <Button className="mt-7" onPress={() => router.push("/vendor/services/new")} variant="primary">
                    Add your first service
                </Button>
            </section>
        );
    } else {
        content = (
            <div className="grid gap-5 xl:grid-cols-2">
                {services.map((service) => (
                    <article className="overflow-hidden rounded-3xl border border-border bg-surface shadow-soft" key={service.id}>
                        <div className="grid sm:grid-cols-[12rem_minmax(0,1fr)]">
                            <div className="relative aspect-[4/3] bg-surface-secondary sm:aspect-auto sm:min-h-56">
                                {service.images[0] ? (
                                    <Image
                                        alt={`Cover image for ${service.serviceName}`}
                                        className="object-cover"
                                        fill
                                        sizes="(max-width: 640px) 100vw, 12rem"
                                        src={service.images[0]}
                                        unoptimized
                                    />
                                ) : (
                                    <div className="grid h-full min-h-40 place-items-center p-5 text-center text-sm text-muted">
                                        No service image
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 p-5 sm:p-6">
                                <div className="flex flex-wrap items-center gap-2">
                                    <StatusBadge status={service.status} />
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${service.availability ? "bg-emerald-50 text-emerald-800" : "bg-default text-muted"}`}>
                                        {service.availability ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <h2 className="mt-3 truncate font-heading text-3xl text-foreground" title={service.serviceName}>
                                    {service.serviceName}
                                </h2>
                                <p className="mt-1 text-sm text-primary">{service.category}</p>
                                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                    <div>
                                        <dt className="text-xs uppercase tracking-wide text-muted">Price</dt>
                                        <dd className="mt-1 font-semibold text-foreground">{new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(service.price)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs uppercase tracking-wide text-muted">Location</dt>
                                        <dd className="mt-1 truncate font-medium text-foreground" title={service.location}>{service.location}</dd>
                                    </div>
                                    <div className="col-span-2">
                                        <dt className="text-xs uppercase tracking-wide text-muted">Created</dt>
                                        <dd className="mt-1 text-foreground">{formatDate(service.createdAt)}</dd>
                                    </div>
                                </dl>
                                <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                                    <Button onPress={() => router.push(`/vendor/services/${encodeURIComponent(service.id)}/edit`)} size="sm" variant="outline">
                                        Edit
                                    </Button>
                                    <Button
                                        isDisabled={availabilityBusyId === service.id || deleteBusyId === service.id}
                                        isPending={availabilityBusyId === service.id}
                                        onPress={() => void toggleAvailability(service)}
                                        size="sm"
                                        variant="outline"
                                    >
                                        {availabilityBusyId === service.id ? "Updating…" : service.availability ? "Deactivate" : "Activate"}
                                    </Button>
                                    <Button
                                        isDisabled={availabilityBusyId === service.id || deleteBusyId === service.id}
                                        onPress={() => setDeleteCandidate(service)}
                                        size="sm"
                                        variant="tertiary"
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        );
    }

    return (
        <>
            <div className="page-shell py-10 sm:py-14 lg:py-16">
                <header className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Vendor workspace</p>
                        <h1 className="font-heading text-4xl font-medium leading-tight text-foreground sm:text-5xl lg:text-6xl">My services</h1>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                            Manage your listings and availability. Review status and service availability are shown separately.
                        </p>
                    </div>
                    <Button className="shrink-0" onPress={() => router.push("/vendor/services/new")} variant="primary">
                        Add new service
                    </Button>
                </header>
                {content}
            </div>

            <AlertDialog
                isOpen={Boolean(deleteCandidate)}
                onOpenChange={(open) => {
                    if (!open && !deleteBusyId) setDeleteCandidate(null);
                }}
            >
                <AlertDialog.Backdrop className="bg-charcoal/45 backdrop-blur-sm" isDismissable>
                    <AlertDialog.Container>
                        <AlertDialog.Dialog className="rounded-2xl border border-border bg-surface p-6 shadow-card">
                            <AlertDialog.Header>
                                <AlertDialog.Heading className="font-heading text-3xl text-foreground">
                                    Delete this service?
                                </AlertDialog.Heading>
                            </AlertDialog.Header>
                            <AlertDialog.Body className="mt-3 text-sm leading-6 text-muted">
                                {deleteCandidate
                                    ? `“${deleteCandidate.serviceName}” will be permanently removed from your services.`
                                    : "This service will be permanently removed."}
                            </AlertDialog.Body>
                            <AlertDialog.Footer className="mt-6 flex justify-end gap-3">
                                <Button
                                    isDisabled={Boolean(deleteBusyId)}
                                    onPress={() => setDeleteCandidate(null)}
                                    variant="outline"
                                >
                                    Keep service
                                </Button>
                                <Button
                                    isDisabled={Boolean(deleteBusyId)}
                                    isPending={Boolean(deleteBusyId)}
                                    onPress={() => void deleteService()}
                                    variant="primary"
                                >
                                    {deleteBusyId ? "Deleting…" : "Delete service"}
                                </Button>
                            </AlertDialog.Footer>
                        </AlertDialog.Dialog>
                    </AlertDialog.Container>
                </AlertDialog.Backdrop>
            </AlertDialog>
        </>
    );
}

export function MyServices() {
    return (
        <>
            <MyServicesContent />
            <ToastProvider placement="top end" />
        </>
    );
}
