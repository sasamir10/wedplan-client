import Image from "next/image";
import Link from "next/link";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const featuredServices = [
    {
        name: "The Heirloom Story",
        category: "Photography & Videography",
        location: "Dhaka",
        price: "From BDT 45,000",
        vendor: "Olive Frame Studio",
        image: "/images/service-photography.webp",
        alt: "Wedding photographer capturing an outdoor ceremony",
    },
    {
        name: "The Garden Room",
        category: "Wedding Venues",
        location: "Gulshan, Dhaka",
        price: "From BDT 1,200 / guest",
        vendor: "Willow House Events",
        image: "/images/service-venue.webp",
        alt: "Light-filled wedding reception venue with ivory florals",
    },
    {
        name: "Petals & Poetry",
        category: "Decoration & Florist",
        location: "Banani, Dhaka",
        price: "From BDT 85,000",
        vendor: "The Petal Atelier",
        image: "/images/service-florist.webp",
        alt: "Ivory and burgundy flowers arranged on a wedding table",
    },
    {
        name: "A Table to Remember",
        category: "Catering Services",
        location: "Dhaka",
        price: "From BDT 950 / guest",
        vendor: "Juniper Table",
        image: "/images/service-catering.webp",
        alt: "An elegant plated dinner prepared for a wedding reception",
    },
    {
        name: "Soft Focus Beauty",
        category: "Makeup & Styling",
        location: "Dhanmondi, Dhaka",
        price: "From BDT 18,000",
        vendor: "Mira Beauty Room",
        image: "/images/service-makeup.webp",
        alt: "Makeup artist preparing a bride in a softly lit room",
    },
    {
        name: "The Keepsake Edit",
        category: "Wedding Fashion",
        location: "Dhaka",
        price: "From BDT 65,000",
        vendor: "House of Aster",
        image: "/images/service-fashion.webp",
        alt: "Bride wearing an ivory and burgundy embroidered wedding outfit",
    },
];

export function FeaturedServicesSection() {
    return (
        <section className="py-section" id="featured-services">
            <div className="page-shell">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <SectionHeading
                        description="A preview of the kinds of details and wedding professionals you can explore."
                        eyebrow="A first look"
                        title="A few lovely places to begin"
                    />
                    <Link
                        className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full border border-border px-5 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:self-auto"
                        href="/services"
                    >
                        Browse all services{" "}
                        <span aria-hidden="true">&rarr;</span>
                    </Link>
                </div>
                <p className="mt-8 inline-flex rounded-full bg-secondary/25 px-4 py-2 text-xs font-medium text-foreground/80">
                    Illustrative sample listings only. These are temporary mock
                    profiles, not live or approved vendors.
                </p>
                <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {featuredServices.map((service, index) => (
                        <Reveal delay={(index % 3) * 0.06} key={service.name}>
                            <article className="h-full overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-shadow hover:shadow-card">
                                <div className="relative aspect-4/3 overflow-hidden bg-surface-secondary">
                                    <Image
                                        alt={service.alt}
                                        className="object-cover"
                                        fill
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        src={service.image}
                                    />
                                    <span className="absolute left-4 top-4 rounded-full bg-background/90 px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-wider text-primary backdrop-blur">
                                        Sample profile
                                    </span>
                                </div>
                                <div className="p-5">
                                    <p className="text-xs font-medium text-primary">
                                        {service.category}
                                    </p>
                                    <h3 className="mt-2 font-heading text-2xl font-medium text-foreground">
                                        {service.name}
                                    </h3>
                                    <p className="mt-1 text-sm text-muted">
                                        {service.vendor}
                                    </p>
                                    <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-sm">
                                        <span className="inline-flex items-center gap-2 text-muted">
                                            <svg
                                                aria-hidden="true"
                                                className="size-4"
                                                fill="none"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    d="M16 8.2c0 4.1-6 9-6 9s-6-4.9-6-9a6 6 0 1 1 12 0Z"
                                                    stroke="currentColor"
                                                    strokeWidth="1.4"
                                                />
                                                <circle
                                                    cx="10"
                                                    cy="8"
                                                    r="1.8"
                                                    stroke="currentColor"
                                                    strokeWidth="1.4"
                                                />
                                            </svg>
                                            {service.location}
                                        </span>
                                        <span className="font-semibold text-foreground">
                                            {service.price}
                                        </span>
                                    </div>
                                </div>
                            </article>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
