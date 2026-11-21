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

type BookingStatus = "Pending" | "Accepted" | "Rejected" | "Cancelled";

const fieldClassName =
    "w-full rounded-xl border border-field-border bg-field-background px-4 py-3 text-sm text-field-foreground shadow-field outline-none transition placeholder:text-field-placeholder focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-65";

interface BookingCustomer {
    name: string | null;
    image: string | null;
}

interface BookingServiceSnapshot {
    serviceName: string;
    category: string;
    image: string;
    price: number;
    vendor: {
        name: string | null;
        businessName: string | null;
    };
}

interface Booking {
    id: string;
    serviceId: string;
    vendorId: string;
    customerId: string;
    eventDate: string;
    eventLocation: string;
    message?: string;
    status: BookingStatus;
    createdAt: string;
    serviceSnapshot: BookingServiceSnapshot;
    customer?: BookingCustomer | null;
}

interface BookingListResponse {
    success: boolean;
    bookings: Booking[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

type FilterValue = "all" | BookingStatus;

const FILTER_LABELS: Record<FilterValue, string> = {
    all: "All requests",
    Pending: "Pending",
    Accepted: "Accepted",
    Rejected: "Rejected",
    Cancelled: "Cancelled",
};

const STATUS_STYLES: Record<BookingStatus, string> = {
    Pending: "border-secondary/70 bg-secondary/25 text-foreground",
    Accepted: "border-emerald-200 bg-emerald-50 text-emerald-800",
    Rejected: "border-rose-200 bg-rose-50 text-rose-800",
    Cancelled: "border-default bg-default text-muted",
};

const priceFormatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
});

function formatPrice(value: number): string {
    return priceFormatter.format(value);
}

function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : new Intl.DateTimeFormat(undefined, {
              dateStyle: "medium",
          }).format(date);
}

function StatusBadge({ status }: { status: BookingStatus }) {
    return (
        <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
        >
            {status}
        </span>
    );
}

function bookingErrorMessage(status: number): string {
    if (status === 401) return "Your session has expired. Please sign in again.";
    if (status === 403)
        return "This action is available to vendor accounts.";
    if (status === 404) return "This booking could not be found.";
    if (status === 409)
        return "Only pending booking requests can be accepted or rejected.";
    return "We couldn't process this request. Please try again.";
}

function bookingActionDialogContent(
    booking: Booking,
    action: "accept" | "reject",
): string {
    const verb = action === "accept" ? "Accept" : "Reject";
    return `${verb} the booking request for “${booking.serviceSnapshot.serviceName}” from ${booking.customer?.name ?? "a customer"} on ${formatDate(booking.eventDate)}?`;
}

export default function VendorBookingsPage() {
    const router = useRouter();
    const {
        data: sessionData,
        isPending: isSessionPending,
        error: sessionError,
    } = authClient.useSession();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });
    const [filter, setFilter] = useState<FilterValue>("all");
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [actionBusyId, setActionBusyId] = useState<string | null>(null);
    const [actionCandidate, setActionCandidate] = useState<{
        booking: Booking;
        action: "accept" | "reject";
    } | null>(null);
    const isVendor = sessionData?.user?.role === "vendor";

    const loadBookings = useCallback(
        async (signal: AbortSignal) => {
            setIsLoading(true);
            setLoadError(null);

            const params = new URLSearchParams();
            params.set("page", String(pagination.page));
            params.set("limit", String(pagination.limit));
            if (filter !== "all") {
                params.set("status", filter);
            }

            try {
                const response = await authenticatedApiRequest(
                    `/api/vendor/bookings?${params.toString()}`,
                    { method: "GET", signal },
                );

                if (!response.ok) {
                    if (response.status === 401) {
                        if (!signal.aborted) router.replace("/sign-in");
                        return;
                    }
                    throw new Error("Unable to load booking requests");
                }

                const payload: unknown = await response.json();
                const result: BookingListResponse = payload as BookingListResponse;

                setBookings(result.bookings);
                setPagination(result.pagination);
            } catch {
                if (!signal.aborted) {
                    setLoadError(
                        "We couldn't load booking requests. Check your connection and try again.",
                    );
                }
            } finally {
                if (!signal.aborted) setIsLoading(false);
            }
        },
        [filter, pagination.page, pagination.limit, router],
    );

    useEffect(() => {
        if (isSessionPending || sessionError || !sessionData?.user || !isVendor) {
            return;
        }

        const controller = new AbortController();
        const startRequest = window.setTimeout(() => {
            if (!controller.signal.aborted) void loadBookings(controller.signal);
        }, 0);
        return () => {
            window.clearTimeout(startRequest);
            controller.abort();
        };
    }, [isSessionPending, sessionData?.user, sessionError, isVendor, loadBookings]);

    function handleFilterChange(next: FilterValue) {
        setFilter(next);
        setPagination((current) => ({ ...current, page: 1 }));
    }

    async function processBookingAction() {
        const candidate = actionCandidate;
        if (!candidate || actionBusyId) return;

        const { booking, action } = candidate;
        const endpoint =
            action === "accept"
                ? `/api/vendor/bookings/${encodeURIComponent(booking.id)}/accept`
                : `/api/vendor/bookings/${encodeURIComponent(booking.id)}/reject`;

        setActionBusyId(booking.id);

        try {
            const response = await authenticatedApiRequest(endpoint, {
                method: "PATCH",
            });

            if (!response.ok) {
                toast.danger(bookingErrorMessage(response.status));
                return;
            }

            setBookings((current) =>
                current.map((item) =>
                    item.id === booking.id
                        ? { ...item, status: action === "accept" ? "Accepted" : "Rejected" }
                        : item,
                ),
            );
            setActionCandidate(null);
            toast.success(
                action === "accept" ? "Booking request accepted." : "Booking request rejected.",
            );
        } catch {
            toast.danger(
                "We couldn't reach WedPlan. Check your connection and try again.",
            );
        } finally {
            setActionBusyId(null);
        }
    }

    let content;

    if (isSessionPending) {
        content = (
            <div className="flex min-h-[55vh] items-center justify-center">
                <p className="text-sm text-muted" role="status">
                    Checking your WedPlan session…
                </p>
            </div>
        );
    } else if (sessionError || !sessionData?.user || !isVendor) {
        const signedIn = Boolean(sessionData?.user);
        content = (
            <section
                className="mx-auto max-w-xl rounded-3xl border border-border bg-surface p-8 text-center shadow-soft sm:p-10"
            >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Vendor workspace
                </p>
                <h1 className="mt-3 font-heading text-4xl text-foreground sm:text-5xl">
                    {signedIn ? "Vendor access required" : "Sign in to continue"}
                </h1>
                <p className="mt-4 leading-7 text-muted">
                    {signedIn
                        ? "This area is for vendor accounts. WedPlan verifies your account for every booking request."
                        : "Sign in with your vendor account to manage booking requests."}
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
                <p className="text-sm text-muted">Loading booking requests…</p>
                <div className="h-52 animate-pulse rounded-3xl bg-surface-secondary" />
                <div className="h-52 animate-pulse rounded-3xl bg-surface-secondary" />
            </div>
        );
    } else if (loadError) {
        content = (
            <section
                className="rounded-3xl border border-border bg-surface p-8 text-center shadow-soft"
            >
                <h2 className="font-heading text-3xl text-foreground">
                    Booking requests couldn’t load
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">{loadError}</p>
                <Button
                    className="mt-6"
                    onPress={() => {
                        setIsLoading(true);
                        setLoadError(null);
                    }}
                    variant="primary"
                >
                    Try again
                </Button>
            </section>
        );
    } else if (bookings.length === 0) {
        content = (
            <section
                className="rounded-3xl border border-dashed border-secondary bg-surface p-8 text-center shadow-soft sm:p-12"
            >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Booking requests
                </p>
                <h2 className="mt-3 font-heading text-4xl text-foreground">
                    No booking requests yet
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-muted">
                    Customers haven’t submitted any booking requests for your
                    services yet. Browse your services to see what’s listed.
                </p>
                <Button
                    className="mt-7"
                    onPress={() => router.push("/vendor/services")}
                    variant="primary"
                >
                    View my services
                </Button>
            </section>
        );
    } else {
        const totalPages = Math.max(1, pagination.totalPages);
        const safePage = Math.min(Math.max(1, pagination.page), totalPages);

        content = (
            <div className="space-y-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-center gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                            Filter by status
                        </p>
                        <select
                            className={fieldClassName}
                            disabled={isLoading}
                            onChange={(event) =>
                                handleFilterChange(
                                    event.currentTarget.value as FilterValue,
                                )
                            }
                            value={filter}
                        >
                            {Object.entries(FILTER_LABELS).map(
                                ([key, label]) => (
                                    <option key={key} value={key as FilterValue}>
                                        {label}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>
                    <p className="text-sm text-muted">
                        Showing {bookings.length} of {pagination.total} booking
                        {pagination.total === 1 ? "" : "s"}
                    </p>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                    {bookings.map((booking) => (
                        <article
                            className="overflow-hidden rounded-3xl border border-border bg-surface shadow-soft"
                            key={booking.id}
                        >
                            <div className="grid sm:grid-cols-[12rem_minmax(0,1fr)]">
                                <div className="relative aspect-[4/3] bg-surface-secondary sm:aspect-auto sm:min-h-56">
                                    {booking.serviceSnapshot.image ? (
                                        <Image
                                            alt={`Service image for ${booking.serviceSnapshot.serviceName}`}
                                            className="object-cover"
                                            fill
                                            sizes="(max-width: 640px) 100vw, 12rem"
                                            src={booking.serviceSnapshot.image}
                                            unoptimized
                                        />
                                    ) : (
                                        <div
                                            className="grid h-full min-h-40 place-items-center p-5 text-center text-sm text-muted"
                                        >
                                            No service image
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 p-5 sm:p-6">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <StatusBadge status={booking.status} />
                                    </div>
                                    <h2
                                        className="mt-1 truncate font-heading text-3xl text-foreground"
                                        title={booking.serviceSnapshot.serviceName}
                                    >
                                        {booking.serviceSnapshot.serviceName}
                                    </h2>
                                    <p className="mt-1 text-sm text-primary">
                                        {booking.serviceSnapshot.category}
                                    </p>
                                    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                        <div>
                                            <dt className="text-xs uppercase tracking-wide text-muted">
                                                Event date
                                            </dt>
                                            <dd className="mt-1 font-medium text-foreground">
                                                {formatDate(booking.eventDate)}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs uppercase tracking-wide text-muted">
                                                Event location
                                            </dt>
                                            <dd className="mt-1 truncate font-medium text-foreground" title={booking.eventLocation}>
                                                {booking.eventLocation}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs uppercase tracking-wide text-muted">
                                                Price
                                            </dt>
                                            <dd className="mt-1 font-semibold text-foreground">
                                                {formatPrice(booking.serviceSnapshot.price)}
                                            </dd>
                                        </div>
                                        <div className="col-span-2">
                                            <dt className="text-xs uppercase tracking-wide text-muted">
                                                Customer
                                            </dt>
                                            <dd className="mt-1 truncate font-medium text-foreground" title={booking.customer?.name ?? "Customer"}>
                                                {booking.customer?.name ?? "Customer"}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs uppercase tracking-wide text-muted">
                                                Requested
                                            </dt>
                                            <dd className="mt-1 text-foreground">
                                                {formatDate(booking.createdAt)}
                                            </dd>
                                        </div>
                                    </dl>
                                    {booking.message && (
                                        <div className="mt-4 rounded-xl border border-border bg-secondary/20 p-3 text-sm leading-6 text-muted">
                                            {booking.message}
                                        </div>
                                    )}
                                    <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
                                        {booking.status === "Pending" && (
                                            <>
                                                <Button
                                                    isDisabled={actionBusyId === booking.id}
                                                    isPending={actionBusyId === booking.id}
                                                    onPress={() =>
                                                        setActionCandidate({
                                                            booking,
                                                            action: "accept",
                                                        })
                                                    }
                                                    size="sm"
                                                    variant="primary"
                                                >
                                                    {actionBusyId === booking.id ? "Accepting…" : "Accept"}
                                                </Button>
                                                <Button
                                                    isDisabled={actionBusyId === booking.id}
                                                    onPress={() =>
                                                        setActionCandidate({
                                                            booking,
                                                            action: "reject",
                                                        })
                                                    }
                                                    size="sm"
                                                    variant="tertiary"
                                                >
                                                    Reject
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                {pagination.totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-between gap-4 text-sm">
                        <Button
                            isDisabled={safePage <= 1 || isLoading}
                            onPress={() =>
                                setPagination((current) => ({
                                    ...current,
                                    page: current.page - 1,
                                }))
                            }
                            variant="outline"
                        >
                            Previous
                        </Button>
                        <p className="text-muted">
                            Page {safePage} of {totalPages}
                        </p>
                        <Button
                            isDisabled={safePage >= totalPages || isLoading}
                            onPress={() =>
                                setPagination((current) => ({
                                    ...current,
                                    page: current.page + 1,
                                }))
                            }
                            variant="outline"
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <div className="page-shell py-10 sm:py-14 lg:py-16">
                <header className="mb-8">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                        Vendor workspace
                    </p>
                    <h1 className="font-heading text-4xl font-medium leading-tight text-foreground sm:text-5xl lg:text-6xl">
                        Booking requests
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                        View and manage booking requests for your services.
                        Accept or reject pending requests from couples.
                    </p>
                </header>
                {content}
            </div>

            <AlertDialog
                isOpen={Boolean(actionCandidate)}
                onOpenChange={(open) => {
                    if (!open && !actionBusyId) setActionCandidate(null);
                }}
            >
                <AlertDialog.Backdrop className="bg-charcoal/45 backdrop-blur-sm" isDismissable>
                    <AlertDialog.Container>
                        <AlertDialog.Dialog className="rounded-2xl border border-border bg-surface p-6 shadow-card">
                            <AlertDialog.Header>
                                <AlertDialog.Heading className="font-heading text-3xl text-foreground">
                                    {actionCandidate?.action === "accept"
                                        ? "Accept booking request?"
                                        : "Reject booking request?"}
                                </AlertDialog.Heading>
                            </AlertDialog.Header>
                            <AlertDialog.Body className="mt-3 text-sm leading-6 text-muted">
                                {actionCandidate && bookingActionDialogContent(actionCandidate.booking, actionCandidate.action)}
                            </AlertDialog.Body>
                            <AlertDialog.Footer className="mt-6 flex justify-end gap-3">
                                <Button
                                    isDisabled={Boolean(actionBusyId)}
                                    onPress={() => setActionCandidate(null)}
                                    variant="outline"
                                >
                                    Keep request
                                </Button>
                                <Button
                                    isDisabled={Boolean(actionBusyId)}
                                    isPending={Boolean(actionBusyId)}
                                    onPress={() => void processBookingAction()}
                                    variant="primary"
                                >
                                    {actionBusyId
                                        ? `${actionCandidate?.action === "accept" ? "Accepting…" : "Rejecting…"}`
                                        : actionCandidate?.action === "accept"
                                          ? "Accept request"
                                          : "Reject request"}
                                </Button>
                            </AlertDialog.Footer>
                        </AlertDialog.Dialog>
                    </AlertDialog.Container>
                </AlertDialog.Backdrop>
            </AlertDialog>
            <ToastProvider placement="top end" />
        </>
    );
}
