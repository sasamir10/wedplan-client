"use client";

import {
    AlertDialog,
    Button,
    Input,
    ToastProvider,
    toast,
} from "@heroui/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    useCallback,
    useEffect,
    useState,
    type FormEvent,
} from "react";
import { authClient } from "@/lib/auth-client";
import { authenticatedApiRequest } from "@/lib/authenticated-api";
import { serviceCategories } from "@/lib/validations/service";
import {
    adminServiceResponseSchema,
    adminServiceStatuses,
    adminServicesResponseSchema,
    type AdminService,
    type AdminServiceStatus,
    type AdminServicesPagination,
} from "@/lib/validations/admin-service";

type ReviewAction = "approve" | "reject" | "status" | "delete";
type PendingAction = {
    kind: ReviewAction;
    service: AdminService;
    status?: AdminServiceStatus;
};

const emptyPagination: AdminServicesPagination = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
};

const selectClassName =
    "min-h-11 w-full rounded-xl border border-field-border bg-field-background px-3 text-sm text-field-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

function statusBadgeStyles(status: AdminServiceStatus) {
    if (status === "Approved") return "border-emerald-200 bg-emerald-50 text-emerald-800";
    if (status === "Rejected") return "border-rose-200 bg-rose-50 text-rose-800";
    return "border-secondary/70 bg-secondary/25 text-foreground";
}

function formatDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function requestError(status: number, action: ReviewAction) {
    if (status === 401) return "Your admin session has expired. Sign in again to continue.";
    if (status === 403) return "Your account is not authorized to manage services.";
    if (status === 404) return "This service no longer exists. The list has been refreshed.";
    if (status === 409) {
        return action === "delete"
            ? "This service changed before it could be deleted. The list has been refreshed."
            : "This service status changed before the action completed. The list has been refreshed.";
    }
    if (status === 400) return "The service request was not accepted. Refresh the list and try again.";
    return action === "delete"
        ? "We couldn't delete this service. Please try again."
        : "We couldn't update this service. Please try again.";
}

function actionTitle(action: PendingAction) {
    if (action.kind === "approve") return "Approve this service?";
    if (action.kind === "reject") return "Reject this service?";
    if (action.kind === "delete") return "Delete this service?";
    return `Change status to ${action.status}?`;
}

function actionDescription(action: PendingAction) {
    const name = `“${action.service.serviceName}”`;
    if (action.kind === "approve") return `${name} will be marked Approved and made eligible for public discovery.`;
    if (action.kind === "reject") return `${name} will be marked Rejected. Its availability remains unchanged.`;
    if (action.kind === "delete") return `${name} and its WedPlan service listing will be permanently deleted.`;
    return `The approval status for ${name} will change to ${action.status}. Its availability and vendor ownership will remain unchanged.`;
}

function AdminServicesContent() {
    const router = useRouter();
    const {
        data: sessionData,
        isPending: isSessionPending,
        error: sessionError,
    } = authClient.useSession();
    const [services, setServices] = useState<AdminService[]>([]);
    const [pagination, setPagination] = useState<AdminServicesPagination>(emptyPagination);
    const [searchDraft, setSearchDraft] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [availabilityFilter, setAvailabilityFilter] = useState("");
    const [page, setPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [statusSelections, setStatusSelections] = useState<Record<string, AdminServiceStatus>>({});
    const isAdmin = sessionData?.user?.role === "admin";

    const loadServices = useCallback(async (signal: AbortSignal) => {
        const query = new URLSearchParams({ page: String(page), limit: String(pagination.limit) });
        if (search) query.set("search", search);
        if (statusFilter) query.set("status", statusFilter);
        if (categoryFilter) query.set("category", categoryFilter);
        if (availabilityFilter) query.set("availability", availabilityFilter);

        try {
            const response = await authenticatedApiRequest(
                `/api/admin/services?${query.toString()}`,
                { method: "GET", signal },
            );
            if (!response.ok) throw new Error("Admin service request failed");

            const payload: unknown = await response.json();
            const result = adminServicesResponseSchema.safeParse(payload);
            if (!result.success) throw new Error("Invalid admin service response");

            setServices(result.data.services);
            setPagination(result.data.pagination);
            setStatusSelections({});
            setLoadError(null);
        } catch {
            if (!signal.aborted) {
                setLoadError("We couldn't load services. Check your connection and try again.");
            }
        } finally {
            if (!signal.aborted) setIsLoading(false);
        }
    }, [availabilityFilter, categoryFilter, page, pagination.limit, search, statusFilter]);

    useEffect(() => {
        if (isSessionPending || sessionError || !sessionData?.user || !isAdmin) return;

        const controller = new AbortController();
        const startRequest = window.setTimeout(() => {
            if (!controller.signal.aborted) void loadServices(controller.signal);
        }, 0);
        return () => {
            window.clearTimeout(startRequest);
            controller.abort();
        };
    }, [isSessionPending, sessionData?.user, sessionError, isAdmin, refreshKey, loadServices]);

    useEffect(() => {
        if (isSessionPending || sessionError) return;
        if (!sessionData?.user) router.replace("/sign-in");
        else if (!isAdmin) router.replace("/");
    }, [isAdmin, isSessionPending, router, sessionData?.user, sessionError]);

    function applySearch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const nextSearch = searchDraft.trim();
        if (nextSearch === search && page === 1) return;
        setIsLoading(true);
        setLoadError(null);
        setPage(1);
        setSearch(nextSearch);
    }

    function updateFilter(
        setter: (value: string) => void,
        value: string,
        currentValue: string,
    ) {
        if (value === currentValue && page === 1) return;
        setIsLoading(true);
        setLoadError(null);
        setPage(1);
        setter(value);
    }

    function resetFilters() {
        if (!search && !statusFilter && !categoryFilter && !availabilityFilter && page === 1) return;
        setIsLoading(true);
        setLoadError(null);
        setSearchDraft("");
        setSearch("");
        setStatusFilter("");
        setCategoryFilter("");
        setAvailabilityFilter("");
        setPage(1);
    }

    function changePage(nextPage: number) {
        if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === page) return;
        setIsLoading(true);
        setLoadError(null);
        setPage(nextPage);
    }

    function refreshList() {
        setIsLoading(true);
        setLoadError(null);
        setRefreshKey((value) => value + 1);
    }

    async function confirmAction() {
        const action = pendingAction;
        if (!action || busyId) return;
        setBusyId(action.service.id);

        try {
            let response: Response;
            const servicePath = `/api/admin/services/${encodeURIComponent(action.service.id)}`;
            if (action.kind === "delete") {
                response = await authenticatedApiRequest(servicePath, { method: "DELETE" });
            } else if (action.kind === "status") {
                response = await authenticatedApiRequest(`${servicePath}/status`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: action.status }),
                });
            } else {
                response = await authenticatedApiRequest(`${servicePath}/${action.kind}`, {
                    method: "PATCH",
                });
            }

            if (!response.ok) {
                toast.danger(requestError(response.status, action.kind));
                setPendingAction(null);
                if (response.status === 404 || response.status === 409) refreshList();
                return;
            }

            if (action.kind === "delete") {
                setServices((current) => current.filter((service) => service.id !== action.service.id));
                setPagination((current) => ({
                    ...current,
                    total: Math.max(0, current.total - 1),
                    totalPages: Math.ceil(Math.max(0, current.total - 1) / current.limit),
                }));
                setPendingAction(null);
                toast.success("Service deleted.");
                if (services.length === 1 && page > 1) {
                    setIsLoading(true);
                    setPage((current) => current - 1);
                }
                return;
            }

            const payload: unknown = await response.json();
            const result = adminServiceResponseSchema.safeParse(payload);
            if (!result.success) {
                toast.danger("The server returned an invalid service update.");
                setPendingAction(null);
                refreshList();
                return;
            }

            const updatedService = result.data.service;
            setServices((current) => current.map((service) =>
                service.id === updatedService.id ? updatedService : service,
            ));
            setStatusSelections((current) => ({
                ...current,
                [updatedService.id]: updatedService.status,
            }));
            setPendingAction(null);
            toast.success(
                action.kind === "approve"
                    ? "Service approved."
                    : action.kind === "reject"
                      ? "Service rejected."
                      : "Service status updated.",
            );
        } catch {
            setPendingAction(null);
            toast.danger("We couldn't reach WedPlan. Check your connection and try again.");
        } finally {
            setBusyId(null);
        }
    }

    if (isSessionPending) {
        return (
            <div className="page-shell flex min-h-[60vh] items-center justify-center py-16">
                <p className="text-sm text-muted" role="status">Checking administrator access…</p>
            </div>
        );
    }

    if (sessionError) {
        return (
            <div className="page-shell flex min-h-[60vh] items-center justify-center py-16">
                <section className="max-w-xl rounded-3xl border border-border bg-surface p-8 text-center shadow-soft">
                    <h1 className="font-heading text-4xl text-foreground">Unable to verify access</h1>
                    <p className="mt-4 leading-7 text-muted">Please sign in again to continue.</p>
                    <Button className="mt-6" onPress={() => router.replace("/sign-in")} variant="primary">Go to sign in</Button>
                </section>
            </div>
        );
    }

    if (!sessionData?.user) {
        return (
            <div className="page-shell flex min-h-[60vh] items-center justify-center py-16">
                <p className="text-sm text-muted" role="status">Redirecting to sign in…</p>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="page-shell flex min-h-[60vh] items-center justify-center py-16">
                <section className="max-w-xl rounded-3xl border border-border bg-surface p-8 text-center shadow-soft">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Admin workspace</p>
                    <h1 className="mt-3 font-heading text-4xl text-foreground">Administrator access required</h1>
                    <p className="mt-4 leading-7 text-muted">This service moderation page is restricted to WedPlan administrators.</p>
                    <Button className="mt-6" onPress={() => router.replace("/")} variant="outline">Return home</Button>
                </section>
            </div>
        );
    }

    const firstResult = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const lastResult = Math.min(pagination.page * pagination.limit, pagination.total);

    return (
        <div className="page-shell py-10 sm:py-14 lg:py-16">
            <header className="mb-8 max-w-4xl sm:mb-10">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Admin workspace</p>
                <h1 className="font-heading text-4xl font-medium leading-tight text-foreground sm:text-5xl lg:text-6xl">Manage services</h1>
                <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
                    Review vendor submissions and manage listing status. Approval status and service availability are tracked independently.
                </p>
            </header>

            <section aria-label="Service search and filters" className="mb-7 rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-6">
                <form className="grid gap-4 lg:grid-cols-[minmax(16rem,1.4fr)_repeat(3,minmax(10rem,1fr))_auto] lg:items-end" onSubmit={applySearch}>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="service-search">Search by service name</label>
                        <Input
                            className="w-full rounded-xl border border-field-border bg-field-background px-4 py-3 text-sm text-field-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                            id="service-search"
                            onChange={(event) => setSearchDraft(event.currentTarget.value)}
                            placeholder="Search services"
                            value={searchDraft}
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="status-filter">Approval status</label>
                        <select className={selectClassName} id="status-filter" onChange={(event) => updateFilter(setStatusFilter, event.currentTarget.value, statusFilter)} value={statusFilter}>
                            <option value="">All statuses</option>
                            {adminServiceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="category-filter">Category</label>
                        <select className={selectClassName} id="category-filter" onChange={(event) => updateFilter(setCategoryFilter, event.currentTarget.value, categoryFilter)} value={categoryFilter}>
                            <option value="">All categories</option>
                            {serviceCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="availability-filter">Availability</label>
                        <select className={selectClassName} id="availability-filter" onChange={(event) => updateFilter(setAvailabilityFilter, event.currentTarget.value, availabilityFilter)} value={availabilityFilter}>
                            <option value="">All availability</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Button isDisabled={isLoading} type="submit" variant="primary">Search</Button>
                        <Button isDisabled={isLoading} onPress={resetFilters} type="button" variant="outline">Reset filters</Button>
                    </div>
                </form>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-sm text-muted">
                    <p aria-live="polite">{isLoading ? "Loading results…" : `Showing ${firstResult}–${lastResult} of ${pagination.total} services`}</p>
                    {(search || statusFilter || categoryFilter || availabilityFilter) && (
                        <p className="text-xs">Filters are applied to the complete service list.</p>
                    )}
                </div>
            </section>

            {isLoading ? (
                <div aria-busy="true" className="space-y-5" role="status">
                    <p className="text-sm text-muted">Loading submitted services…</p>
                    <div className="h-56 animate-pulse rounded-3xl bg-surface-secondary" />
                    <div className="h-56 animate-pulse rounded-3xl bg-surface-secondary" />
                </div>
            ) : loadError ? (
                <section className="rounded-3xl border border-border bg-surface p-8 text-center shadow-soft">
                    <h2 className="font-heading text-3xl text-foreground">Services couldn’t load</h2>
                    <p className="mt-3 text-sm leading-6 text-muted">{loadError}</p>
                    <Button className="mt-6" onPress={refreshList} variant="primary">Try again</Button>
                </section>
            ) : services.length === 0 ? (
                <section className="rounded-3xl border border-dashed border-secondary bg-surface p-8 text-center shadow-soft sm:p-12">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Service moderation</p>
                    <h2 className="mt-3 font-heading text-4xl text-foreground">No services match these filters</h2>
                    <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-muted">Try another status, category, availability, or search term.</p>
                    <Button className="mt-6" onPress={resetFilters} variant="outline">Reset filters</Button>
                </section>
            ) : (
                <div className="space-y-5">
                    {services.map((service) => {
                        const selectedStatus = statusSelections[service.id] ?? service.status;
                        const statusFieldId = `status-${service.id}`;
                        return (
                            <article className="overflow-hidden rounded-3xl border border-border bg-surface shadow-soft" key={service.id}>
                                <div className="grid md:grid-cols-[15rem_minmax(0,1fr)]">
                                    <div className="relative aspect-[4/3] bg-surface-secondary md:aspect-auto md:min-h-64">
                                        {service.images[0] ? (
                                            <Image alt={`Service image for ${service.serviceName}`} className="object-cover" fill sizes="(max-width: 768px) 100vw, 15rem" src={service.images[0]} unoptimized />
                                        ) : (
                                            <div className="grid h-full min-h-48 place-items-center p-5 text-center text-sm text-muted">No service image</div>
                                        )}
                                    </div>
                                    <div className="min-w-0 p-5 sm:p-6 lg:p-7">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeStyles(service.status)}`}>{service.status}</span>
                                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${service.availability ? "bg-emerald-50 text-emerald-800" : "bg-default text-muted"}`}>
                                                {service.availability ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0">
                                                <h2 className="font-heading text-3xl text-foreground sm:text-4xl">{service.serviceName}</h2>
                                                <p className="mt-1 text-sm font-medium text-primary">{service.category}</p>
                                            </div>
                                            <p className="shrink-0 text-lg font-semibold text-foreground">{new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(service.price)}</p>
                                        </div>
                                        <p className="mt-4 text-sm leading-6 text-muted line-clamp-3">{service.description}</p>
                                        <dl className="mt-5 grid gap-x-5 gap-y-4 border-t border-border pt-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                            <div>
                                                <dt className="text-xs uppercase tracking-wide text-muted">Vendor</dt>
                                                <dd className="mt-1 font-medium text-foreground">{service.vendor?.name ?? "Vendor account unavailable"}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs uppercase tracking-wide text-muted">Business</dt>
                                                <dd className="mt-1 font-medium text-foreground">{service.vendor?.businessName ?? "Not provided"}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs uppercase tracking-wide text-muted">Location · Created</dt>
                                                <dd className="mt-1 text-foreground">{service.location} · {formatDate(service.createdAt)}</dd>
                                            </div>
                                        </dl>

                                        <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5 xl:flex-row xl:items-end xl:justify-between">
                                            {service.status === "Pending" && (
                                                <div className="flex flex-wrap gap-2" aria-label={`Review ${service.serviceName}`}>
                                                    <Button isDisabled={Boolean(busyId)} onPress={() => setPendingAction({ kind: "approve", service })} variant="primary">
                                                        Approve
                                                    </Button>
                                                    <Button isDisabled={Boolean(busyId)} onPress={() => setPendingAction({ kind: "reject", service })} variant="outline">
                                                        Reject
                                                    </Button>
                                                </div>
                                            )}
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                                <div className="min-w-48">
                                                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor={statusFieldId}>Change approval status</label>
                                                    <select
                                                        className={selectClassName}
                                                        disabled={Boolean(busyId)}
                                                        id={statusFieldId}
                                                        onChange={(event) => setStatusSelections((current) => ({ ...current, [service.id]: event.currentTarget.value as AdminServiceStatus }))}
                                                        value={selectedStatus}
                                                    >
                                                        {adminServiceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                                                    </select>
                                                </div>
                                                <Button
                                                    isDisabled={Boolean(busyId) || selectedStatus === service.status}
                                                    onPress={() => setPendingAction({ kind: "status", service, status: selectedStatus })}
                                                    variant="outline"
                                                >
                                                    Change status
                                                </Button>
                                                <Button
                                                    isDisabled={Boolean(busyId)}
                                                    onPress={() => setPendingAction({ kind: "delete", service })}
                                                    variant="tertiary"
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {!isLoading && !loadError && pagination.totalPages > 1 && (
                <nav aria-label="Service result pages" className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
                    <p className="text-sm text-muted">Page {pagination.page} of {pagination.totalPages}</p>
                    <div className="flex gap-2">
                        <Button isDisabled={page <= 1} onPress={() => changePage(page - 1)} variant="outline">Previous</Button>
                        <Button isDisabled={page >= pagination.totalPages} onPress={() => changePage(page + 1)} variant="outline">Next</Button>
                    </div>
                </nav>
            )}

            <AlertDialog
                isOpen={Boolean(pendingAction)}
                onOpenChange={(open) => {
                    if (!open && !busyId) setPendingAction(null);
                }}
            >
                <AlertDialog.Backdrop className="bg-charcoal/45 backdrop-blur-sm" isDismissable>
                    <AlertDialog.Container>
                        <AlertDialog.Dialog className="rounded-2xl border border-border bg-surface p-6 shadow-card">
                            <AlertDialog.Header>
                                <AlertDialog.Heading className="font-heading text-3xl text-foreground">
                                    {pendingAction ? actionTitle(pendingAction) : "Confirm service action"}
                                </AlertDialog.Heading>
                            </AlertDialog.Header>
                            <AlertDialog.Body className="mt-3 text-sm leading-6 text-muted">
                                {pendingAction ? actionDescription(pendingAction) : "Review this action before continuing."}
                            </AlertDialog.Body>
                            <AlertDialog.Footer className="mt-6 flex flex-wrap justify-end gap-3">
                                <Button isDisabled={Boolean(busyId)} onPress={() => setPendingAction(null)} variant="outline">Cancel</Button>
                                <Button isDisabled={Boolean(busyId)} isPending={Boolean(busyId)} onPress={() => void confirmAction()} variant="primary">
                                    {busyId ? "Saving…" : pendingAction?.kind === "delete" ? "Delete service" : "Confirm"}
                                </Button>
                            </AlertDialog.Footer>
                        </AlertDialog.Dialog>
                    </AlertDialog.Container>
                </AlertDialog.Backdrop>
            </AlertDialog>
        </div>
    );
}

export function AdminServices() {
    // HeroUI's ToastProvider renders a toast region, not page children.
    return (
        <>
            <AdminServicesContent />
            <ToastProvider placement="top end" />
        </>
    );
}
