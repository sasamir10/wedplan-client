"use client";

import { Button } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { authenticatedApiRequest } from "@/lib/authenticated-api";
import {
    publicServiceDetailResponseSchema,
    type PublicServiceDetail,
} from "@/lib/validations/service";
import { BookingForm } from "./BookingForm";

const priceFormatter = new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
});

function servicePrice(price: number): string {
    return priceFormatter.format(price);
}

function listedDate(value: string): string | null {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

function vendorDisplay(service: PublicServiceDetail) {
    const businessName = service.vendor?.businessName?.trim() || null;
    const name = service.vendor?.name?.trim() || null;

    return {
        businessName,
        name,
        primary: businessName ?? name ?? "Wedding professional",
    };
}

function initials(value: string): string {
    return value
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

function DetailsSkeleton({ label }: { label: string }) {
    return (
        <div
            aria-busy="true"
            className="page-shell py-10 sm:py-14 lg:py-16"
            role="status"
        >
            <span className="sr-only">{label}</span>
            <div aria-hidden="true" className="mb-8 space-y-3">
                <div className="h-3 w-28 animate-pulse rounded bg-surface-secondary" />
                <div className="h-12 w-3/4 animate-pulse rounded bg-surface-secondary" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-surface-secondary" />
            </div>
            <div
                aria-hidden="true"
                className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(19rem,1fr)]"
            >
                <div className="space-y-6">
                    <div className="aspect-4/3 animate-pulse rounded-3xl bg-surface-secondary" />
                    <div className="space-y-3 rounded-3xl border border-border bg-surface p-6 shadow-soft">
                        <div className="h-5 w-2/5 animate-pulse rounded bg-surface-secondary" />
                        <div className="h-3 w-full animate-pulse rounded bg-surface-secondary" />
                        <div className="h-3 w-11/12 animate-pulse rounded bg-surface-secondary" />
                        <div className="h-3 w-4/5 animate-pulse rounded bg-surface-secondary" />
                    </div>
                </div>
                <div className="h-80 animate-pulse rounded-3xl bg-surface-secondary" />
            </div>
        </div>
    );
}

function RedirectingToSignIn() {
    return (
        <div className="page-shell flex min-h-[60vh] items-center justify-center py-12">
            <section
                className="w-full max-w-xl rounded-3xl border border-border bg-surface p-8 text-center shadow-soft sm:p-10"
                role="status"
            >
                <h1 className="font-heading text-4xl text-foreground">
                    Sign in to continue
                </h1>
                <p className="mt-4 leading-7 text-muted">
                    Service details are available to signed-in WedPlan members.
                    Redirecting you to sign in…
                </p>
                <Link
                    className="mt-6 inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground"
                    href="/sign-in"
                >
                    Sign in
                </Link>
            </section>
        </div>
    );
}

function ServiceNotFound() {
    return (
        <div className="page-shell py-12 sm:py-16">
            <section className="mx-auto max-w-2xl rounded-3xl border border-border bg-surface p-8 text-center shadow-soft sm:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Service details
                </p>
                <h1 className="mt-3 font-heading text-4xl text-foreground">
                    This service is not available
                </h1>
                <p className="mt-4 text-sm leading-7 text-muted">
                    The listing may have been removed, taken offline by its
                    vendor, or not yet approved. Only approved and active
                    services appear on WedPlan.
                </p>
                <Link
                    className="mt-6 inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground"
                    href="/services"
                >
                    Browse available services
                </Link>
            </section>
        </div>
    );
}

function ServiceLoadError({
    message,
    onRetry,
}: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <div className="page-shell py-12 sm:py-16">
            <section
                className="mx-auto max-w-2xl rounded-3xl border border-border bg-surface p-8 text-center shadow-soft sm:p-10"
                role="alert"
            >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Service details
                </p>
                <h1 className="mt-3 font-heading text-4xl text-foreground">
                    We couldn’t load this service
                </h1>
                <p className="mt-4 text-sm leading-7 text-muted">{message}</p>
                <Button className="mt-6" onPress={onRetry} variant="primary">
                    Try again
                </Button>
                <div className="mt-5">
                    <Link
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                        href="/services"
                    >
                        Back to Browse Services
                    </Link>
                </div>
            </section>
        </div>
    );
}

function ServiceGallery({ service }: { service: PublicServiceDetail }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [failedImages, setFailedImages] = useState<ReadonlySet<string>>(
        new Set(),
    );
    const images = service.images;
    const safeIndex = images.length === 0 ? 0 : Math.min(activeIndex, images.length - 1);
    const activeImage = images[safeIndex];
    const activeFailed = activeImage ? failedImages.has(activeImage) : false;

    function markFailed(url: string) {
        setFailedImages((current) => {
            if (current.has(url)) {
                return current;
            }

            const next = new Set(current);
            next.add(url);
            return next;
        });
    }

    return (
        <section aria-label="Service images">
            <div className="relative aspect-4/3 overflow-hidden rounded-3xl border border-border bg-surface-secondary shadow-soft">
                {activeImage && !activeFailed ? (
                    <Image
                        alt={`${service.serviceName} — image ${safeIndex + 1} of ${images.length}`}
                        className="object-cover"
                        fill
                        onError={() => markFailed(activeImage)}
                        sizes="(max-width: 1024px) 100vw, 60vw"
                        src={activeImage}
                        unoptimized
                    />
                ) : (
                    <div className="grid h-full place-items-center px-6 text-center">
                        <div>
                            <p className="font-heading text-2xl text-foreground">
                                Image unavailable
                            </p>
                            <p className="mt-2 text-sm text-muted">
                                {images.length > 0
                                    ? "This image couldn’t be loaded. Try another image below."
                                    : "No images are available for this service."}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {images.length > 1 && (
                <div
                    aria-label="Choose a service image"
                    className="mt-4 flex gap-3 overflow-x-auto pb-2"
                    role="group"
                >
                    {images.map((url, index) => {
                        const failed = failedImages.has(url);
                        const selected = index === safeIndex;

                        return (
                            <button
                                aria-label={`Show image ${index + 1} of ${images.length}`}
                                aria-pressed={selected}
                                className={`relative size-20 shrink-0 overflow-hidden rounded-xl border-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                                    selected
                                        ? "border-primary"
                                        : "border-transparent hover:border-secondary"
                                }`}
                                key={`${url}-${index}`}
                                onClick={() => setActiveIndex(index)}
                                type="button"
                            >
                                {failed ? (
                                    <span className="grid size-full place-items-center bg-surface-secondary px-1 text-center text-[0.65rem] leading-4 text-muted">
                                        Unavailable
                                    </span>
                                ) : (
                                    <Image
                                        alt=""
                                        className="object-cover"
                                        fill
                                        onError={() => markFailed(url)}
                                        sizes="80px"
                                        src={url}
                                        unoptimized
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

function VendorCard({ service }: { service: PublicServiceDetail }) {
    const vendor = vendorDisplay(service);
    const showVendorName =
        vendor.businessName !== null &&
        vendor.name !== null &&
        vendor.businessName !== vendor.name;

    return (
        <section
            aria-labelledby="vendor-heading"
            className="rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-7"
        >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Vendor
            </p>
            <div className="mt-4 flex items-center gap-4">
                <span
                    aria-hidden="true"
                    className="grid size-14 shrink-0 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground"
                >
                    {initials(vendor.primary)}
                </span>
                <div className="min-w-0">
                    <h2
                        className="break-words font-heading text-2xl text-foreground"
                        id="vendor-heading"
                    >
                        {vendor.primary}
                    </h2>
                    {showVendorName && (
                        <p className="mt-1 break-words text-sm text-muted">
                            Professional: {vendor.name}
                        </p>
                    )}
                    {!service.vendor && (
                        <p className="mt-1 text-sm text-muted">
                            Vendor display details are unavailable for this
                            listing.
                        </p>
                    )}
                </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
                WedPlan shows only public vendor display information on service
                pages. Private account details are never shared.
            </p>
        </section>
    );
}

function BookingPanel({
    role,
    isOwner,
}: {
    role: string | undefined;
    isOwner: boolean;
}) {
    const panelClassName =
        "rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-7";

    if (role === "customer") {
        return (
            <section aria-labelledby="booking-heading" className={panelClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Booking
                </p>
                <h2
                    className="mt-3 font-heading text-3xl text-foreground"
                    id="booking-heading"
                >
                    Request this service
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                    Booking requests are coming to WedPlan soon. You’ll be able
                    to share your event date, guest count, and a message with
                    this vendor from this page.
                </p>
                <p className="mt-5 inline-flex rounded-full bg-secondary/35 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground">
                    Booking requests coming soon
                </p>
                <p className="mt-4 text-xs leading-5 text-muted">
                    No booking has been submitted.
                </p>
            </section>
        );
    }

    if (role === "vendor") {
        return (
            <section aria-labelledby="booking-heading" className={panelClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Booking
                </p>
                <h2
                    className="mt-3 font-heading text-3xl text-foreground"
                    id="booking-heading"
                >
                    {isOwner ? "This is your listing" : "Vendor account"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                    {isOwner
                        ? "You’re viewing your own service. Vendors cannot submit customer booking requests for their own listings."
                        : "Vendor accounts cannot submit customer booking requests. Sign in with a customer account to book another vendor’s service."}
                </p>
                {isOwner && (
                    <Link
                        className="mt-5 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
                        href="/vendor/services"
                    >
                        Manage your services
                    </Link>
                )}
            </section>
        );
    }

    if (role === "admin") {
        return (
            <section aria-labelledby="booking-heading" className={panelClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Booking
                </p>
                <h2
                    className="mt-3 font-heading text-3xl text-foreground"
                    id="booking-heading"
                >
                    Administrator view
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                    Administrator accounts cannot submit customer booking
                    requests. This page shows the approved service details for
                    review only.
                </p>
            </section>
        );
    }

    return (
        <section aria-labelledby="booking-heading" className={panelClassName}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Booking
            </p>
            <h2
                className="mt-3 font-heading text-3xl text-foreground"
                id="booking-heading"
            >
                Booking unavailable
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
                Sign in with a customer account to request this service.
            </p>
        </section>
    );
}

export function ServiceDetails({ serviceId }: { serviceId: string }) {
    const router = useRouter();
    const {
        data: sessionData,
        isPending: isSessionPending,
        error: sessionError,
    } = authClient.useSession();
    const [service, setService] = useState<PublicServiceDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [sessionExpired, setSessionExpired] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const userId = sessionData?.user?.id;
    const role = sessionData?.user?.role;

    useEffect(() => {
        if (!isSessionPending && (sessionError || !userId)) {
            router.replace("/sign-in");
        }
    }, [isSessionPending, sessionError, userId, router]);

    const loadService = useCallback(
        async (signal: AbortSignal) => {
            setIsLoading(true);
            setLoadError(null);
            setNotFound(false);

            try {
                const response = await authenticatedApiRequest(
                    `/api/services/${encodeURIComponent(serviceId)}`,
                    {
                        method: "GET",
                        headers: { Accept: "application/json" },
                        cache: "no-store",
                        signal,
                    },
                );

                if (response.status === 401) {
                    if (!signal.aborted) {
                        setSessionExpired(true);
                        router.replace("/sign-in");
                    }
                    return;
                }

                if (response.status === 404) {
                    if (!signal.aborted) {
                        setService(null);
                        setNotFound(true);
                    }
                    return;
                }

                if (!response.ok) {
                    if (!signal.aborted) {
                        setLoadError(
                            "The service details are temporarily unavailable. Please try again in a moment.",
                        );
                    }
                    return;
                }

                const payload: unknown = await response.json();
                const parsed = publicServiceDetailResponseSchema.safeParse(payload);

                if (!parsed.success) {
                    if (!signal.aborted) {
                        setLoadError(
                            "The service details could not be read. Please try again.",
                        );
                    }
                    return;
                }

                if (!signal.aborted) {
                    setService(parsed.data.service);
                }
            } catch {
                if (!signal.aborted) {
                    setLoadError(
                        "We couldn’t reach WedPlan. Check your connection and try again.",
                    );
                }
            } finally {
                if (!signal.aborted) {
                    setIsLoading(false);
                }
            }
        },
        [router, serviceId],
    );

    useEffect(() => {
        if (isSessionPending || sessionError || !userId || sessionExpired) {
            return;
        }

        const controller = new AbortController();
        const startRequest = window.setTimeout(() => {
            if (!controller.signal.aborted) {
                void loadService(controller.signal);
            }
        }, 0);

        return () => {
            window.clearTimeout(startRequest);
            controller.abort();
        };
    }, [
        isSessionPending,
        sessionError,
        userId,
        sessionExpired,
        retryCount,
        loadService,
    ]);

    if (isSessionPending) {
        return <DetailsSkeleton label="Checking your WedPlan session…" />;
    }

    if (sessionError || !userId) {
        return <RedirectingToSignIn />;
    }

    if (sessionExpired) {
        return <RedirectingToSignIn />;
    }

    if (isLoading) {
        return <DetailsSkeleton label="Loading service details…" />;
    }

    if (notFound) {
        return <ServiceNotFound />;
    }

    if (loadError || !service) {
        return (
            <ServiceLoadError
                message={
                    loadError ??
                    "The service details are temporarily unavailable. Please try again in a moment."
                }
                onRetry={() => {
                    setIsLoading(true);
                    setRetryCount((value) => value + 1);
                }}
            />
        );
    }

    const vendor = vendorDisplay(service);
    const addedOn = listedDate(service.createdAt);

    return (
        <div className="page-shell py-10 sm:py-14 lg:py-16">
            <nav
                aria-label="Breadcrumb"
                className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted"
            >
                <Link
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    href="/services"
                >
                    Browse services
                </Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page" className="break-words text-foreground">
                    {service.serviceName}
                </span>
            </nav>

            <header className="mb-8">
                <p className="inline-flex rounded-full bg-secondary/35 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground">
                    {service.category}
                </p>
                <h1 className="mt-4 break-words font-heading text-4xl leading-tight text-foreground sm:text-5xl lg:text-6xl">
                    {service.serviceName}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <span className="break-words text-muted">
                        {service.location}
                    </span>
                    <span className="font-semibold text-foreground">
                        {servicePrice(service.price)}
                    </span>
                    <span className="inline-flex items-center gap-2 text-muted">
                        <span
                            aria-hidden="true"
                            className="size-2 rounded-full bg-primary"
                        />
                        Approved and currently available
                    </span>
                </div>
            </header>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(19rem,1fr)] lg:items-start">
                <div className="min-w-0 space-y-8">
                    <ServiceGallery key={service.id} service={service} />

                    <section
                        aria-labelledby="about-heading"
                        className="rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-7"
                    >
                        <h2
                            className="font-heading text-3xl text-foreground"
                            id="about-heading"
                        >
                            About this service
                        </h2>
                        <p className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-muted sm:text-base">
                            {service.description}
                        </p>
                    </section>

                    <VendorCard service={service} />
                </div>

                <aside className="space-y-6 lg:sticky lg:top-24">
                    {role === "customer" ? (
                        <BookingForm serviceId={serviceId} />
                    ) : (
                        <BookingPanel isOwner={service.isOwner} role={role} />
                    )}

                    <section
                        aria-labelledby="service-facts-heading"
                        className="rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-7"
                    >
                        <h2
                            className="font-heading text-2xl text-foreground"
                            id="service-facts-heading"
                        >
                            Service details
                        </h2>
                        <dl className="mt-5 space-y-4 text-sm">
                            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                                <dt className="text-muted">Category</dt>
                                <dd className="max-w-[60%] break-words text-right font-medium text-foreground">
                                    {service.category}
                                </dd>
                            </div>
                            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                                <dt className="text-muted">Price</dt>
                                <dd className="text-right font-medium text-foreground">
                                    {servicePrice(service.price)}
                                </dd>
                            </div>
                            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                                <dt className="text-muted">Location</dt>
                                <dd className="max-w-[60%] break-words text-right font-medium text-foreground">
                                    {service.location}
                                </dd>
                            </div>
                            <div className="flex items-start justify-between gap-4">
                                <dt className="text-muted">Vendor</dt>
                                <dd className="max-w-[60%] break-words text-right font-medium text-foreground">
                                    {vendor.primary}
                                </dd>
                            </div>
                            {addedOn && (
                                <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
                                    <dt className="text-muted">Listed</dt>
                                    <dd className="text-right font-medium text-foreground">
                                        {addedOn}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </section>
                </aside>
            </div>
        </div>
    );
}
