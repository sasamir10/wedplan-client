"use client";

import {
    publicServicesResponseSchema,
    type PublicServiceSort,
    serviceCategories,
    type PublicService,
} from "@/lib/validations/service";
import { Button } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const skeletonCardKeys = ["first", "second", "third", "fourth", "fifth", "sixth"];
const filterControlClassName =
    "w-full rounded-xl border border-field-border bg-field-background px-4 py-3 text-sm text-field-foreground outline-none transition placeholder:text-field-placeholder focus:border-primary focus:ring-2 focus:ring-primary/15";

function servicePrice(price: number): string {
    return new Intl.NumberFormat("en-BD", {
        style: "currency",
        currency: "BDT",
        maximumFractionDigits: 2,
    }).format(price);
}

function ServiceCard({ service }: { service: PublicService }) {
    const [imageFailed, setImageFailed] = useState(false);
    const coverImage = service.images[0];
    const businessName = service.vendor?.businessName;
    const vendorName = service.vendor?.name;

    return (
        <article className="h-full min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-shadow hover:shadow-card">
            <div className="relative aspect-4/3 overflow-hidden bg-surface-secondary">
                {coverImage && !imageFailed ? (
                    <Image
                        alt={`Wedding service image for ${service.serviceName}`}
                        className="object-cover"
                        fill
                        onError={() => setImageFailed(true)}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        src={coverImage}
                        unoptimized
                    />
                ) : (
                    <div className="grid h-full place-items-center px-6 text-center text-sm text-muted">
                        <span>No service image available</span>
                    </div>
                )}
            </div>
            <div className="flex min-h-64 flex-col p-5">
                <p className="text-xs font-medium text-primary">{service.category}</p>
                <h2
                    className="mt-2 line-clamp-2 min-h-[3.5rem] font-heading text-2xl font-medium text-foreground"
                    title={service.serviceName}
                >
                    {service.serviceName}
                </h2>
                <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-muted">
                    {service.description}
                </p>

                <div className="mt-4 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground" title={businessName ?? vendorName ?? undefined}>
                        {businessName ?? vendorName ?? "Wedding professional"}
                    </p>
                    {businessName && vendorName && businessName !== vendorName && (
                        <p className="mt-1 truncate text-xs text-muted" title={vendorName}>
                            {vendorName}
                        </p>
                    )}
                </div>

                <div className="mt-5 flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
                    <span className="max-w-[55%] truncate text-muted" title={service.location}>
                        {service.location}
                    </span>
                    <span className="text-right font-semibold text-foreground">
                        {servicePrice(service.price)}
                    </span>
                </div>

                <Link
                    className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-primary px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                    href={`/services/${encodeURIComponent(service.id)}`}
                >
                    View Details
                </Link>
            </div>
        </article>
    );
}

export function ServicesBrowser() {
    const [services, setServices] = useState<PublicService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [category, setCategory] = useState("");
    const [location, setLocation] = useState("");
    const [debouncedLocation, setDebouncedLocation] = useState("");
    const [sort, setSort] = useState<PublicServiceSort>("default");

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
            setDebouncedLocation(location.trim());
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [search, location]);

    useEffect(() => {
        const controller = new AbortController();

        async function loadServices() {
            setIsLoading(true);
            setHasError(false);

            try {
                const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
                if (!configuredBaseUrl) throw new Error("API unavailable");

                const baseUrl = new URL(configuredBaseUrl);
                const endpoint = new URL("/api/services", baseUrl);
                const query = new URLSearchParams();
                if (debouncedSearch) query.set("search", debouncedSearch);
                if (category) query.set("category", category);
                if (debouncedLocation) query.set("location", debouncedLocation);
                if (sort !== "default") query.set("sort", sort);
                endpoint.search = query.toString();

                const response = await fetch(endpoint, {
                    method: "GET",
                    headers: { Accept: "application/json" },
                    credentials: "omit",
                    cache: "no-store",
                    signal: controller.signal,
                });

                if (!response.ok) throw new Error("Service request failed");

                const payload: unknown = await response.json();
                const parsed = publicServicesResponseSchema.safeParse(payload);
                if (!parsed.success) throw new Error("Invalid service response");

                setServices(parsed.data.services);
            } catch {
                if (!controller.signal.aborted) setHasError(true);
            } finally {
                if (!controller.signal.aborted) setIsLoading(false);
            }
        }

        void loadServices();
        return () => controller.abort();
    }, [attempt, category, debouncedLocation, debouncedSearch, sort]);

    const isDebouncing =
        search.trim() !== debouncedSearch ||
        location.trim() !== debouncedLocation;
    const showLoading = isLoading || isDebouncing;
    const hasActiveOptions =
        search.trim().length > 0 ||
        category.length > 0 ||
        location.trim().length > 0 ||
        sort !== "default";

    function resetFilters() {
        setSearch("");
        setDebouncedSearch("");
        setCategory("");
        setLocation("");
        setDebouncedLocation("");
        setSort("default");
        setAttempt((value) => value + 1);
    }

    return (
        <div className="page-shell py-10 sm:py-14 lg:py-16">
            <header className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
                <p className="mb-4 inline-flex rounded-full bg-secondary/35 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground">
                    Browse services
                </p>
                <h1 className="font-heading text-5xl font-medium leading-tight text-foreground sm:text-6xl">
                    Find the right people for your celebration
                </h1>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                    Explore wedding professionals and services to find the details that feel right for your day.
                </p>
            </header>

            <section
                aria-label="Filter services"
                className="mb-8 rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-6"
            >
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(11rem,1fr))]">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="service-search">
                            Search by service name
                        </label>
                        <input
                            autoComplete="off"
                            className={filterControlClassName}
                            id="service-search"
                            maxLength={120}
                            onChange={(event) => setSearch(event.currentTarget.value)}
                            placeholder="Try photography or decoration"
                            type="search"
                            value={search}
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="service-category">
                            Category
                        </label>
                        <select
                            className={`${filterControlClassName} h-12`}
                            id="service-category"
                            onChange={(event) => setCategory(event.currentTarget.value)}
                            value={category}
                        >
                            <option value="">All Categories</option>
                            {serviceCategories.map((serviceCategory) => (
                                <option key={serviceCategory} value={serviceCategory}>
                                    {serviceCategory}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="service-location">
                            Location
                        </label>
                        <input
                            autoComplete="address-level2"
                            className={filterControlClassName}
                            id="service-location"
                            maxLength={200}
                            onChange={(event) => setLocation(event.currentTarget.value)}
                            placeholder="City or neighborhood"
                            type="search"
                            value={location}
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="service-sort">
                            Sort by
                        </label>
                        <select
                            className={`${filterControlClassName} h-12`}
                            id="service-sort"
                            onChange={(event) => setSort(event.currentTarget.value as PublicServiceSort)}
                            value={sort}
                        >
                            <option value="default">Default</option>
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                        </select>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p aria-live="polite" className="text-sm text-muted">
                        {showLoading
                            ? "Updating service results…"
                            : `${services.length} ${services.length === 1 ? "service" : "services"} found`}
                    </p>
                    <Button
                        isDisabled={!hasActiveOptions}
                        onPress={resetFilters}
                        size="sm"
                        variant="outline"
                    >
                        Reset All
                    </Button>
                </div>
            </section>

            {showLoading ? (
                <div aria-busy="true" aria-label="Loading wedding services" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status">
                    {skeletonCardKeys.map((key) => (
                        <div className="overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-soft" key={key}>
                            <div className="aspect-4/3 animate-pulse rounded-xl bg-surface-secondary" />
                            <div className="mt-5 h-3 w-2/5 animate-pulse rounded bg-surface-secondary" />
                            <div className="mt-3 h-7 w-4/5 animate-pulse rounded bg-surface-secondary" />
                            <div className="mt-5 h-4 w-3/5 animate-pulse rounded bg-surface-secondary" />
                            <div className="mt-6 h-10 animate-pulse rounded-full bg-surface-secondary" />
                        </div>
                    ))}
                </div>
            ) : hasError ? (
                <section className="mx-auto max-w-xl rounded-3xl border border-border bg-surface p-8 text-center shadow-soft sm:p-10" role="alert">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Service directory</p>
                    <h2 className="mt-3 font-heading text-3xl text-foreground">Services couldn’t load</h2>
                    <p className="mt-3 text-sm leading-6 text-muted">
                        We couldn’t reach the service directory. Please try again in a moment.
                    </p>
                    <Button className="mt-6" onPress={() => setAttempt((value) => value + 1)} variant="primary">
                        Try again
                    </Button>
                </section>
            ) : services.length === 0 && hasActiveOptions ? (
                <section className="mx-auto max-w-2xl rounded-3xl border border-dashed border-secondary bg-surface p-8 text-center shadow-soft sm:p-12" role="status">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">No matching services</p>
                    <h2 className="mt-3 font-heading text-4xl text-foreground">No services match your current search, filters, and sorting.</h2>
                    <p className="mt-4 text-sm leading-7 text-muted">
                        Try a different name, category, or location, or reset all filters to browse every available service.
                    </p>
                    <Button className="mt-6" onPress={resetFilters} variant="primary">
                        Reset All
                    </Button>
                </section>
            ) : services.length === 0 ? (
                <section className="mx-auto max-w-2xl rounded-3xl border border-dashed border-secondary bg-surface p-8 text-center shadow-soft sm:p-12" role="status">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Browse services</p>
                    <h2 className="mt-3 font-heading text-4xl text-foreground">No wedding services available yet.</h2>
                    <p className="mt-4 text-sm leading-7 text-muted">
                        Please check back soon as approved wedding professionals join WedPlan.
                    </p>
                </section>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {services.map((service) => (
                        <ServiceCard key={service.id} service={service} />
                    ))}
                </div>
            )}
        </div>
    );
}
