import Link from "next/link";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const categories = [
    "Photography & Videography",
    "Wedding Venues",
    "Decoration & Florist",
    "Catering Services",
    "Makeup & Styling",
    "Wedding Fashion",
];

export function CategoriesSection() {
    return (
        <section
            className="bg-surface-secondary py-section"
            id="service-categories"
        >
            <div className="page-shell">
                <SectionHeading
                    description="Every celebration is different. Start with the kind of help you need most."
                    eyebrow="Find your starting point"
                    title="Explore by category"
                />
                <div className="mt-10 grid gap-x-12 md:grid-cols-2">
                    {categories.map((category, index) => (
                        <Reveal key={category} delay={(index % 2) * 0.05}>
                            <Link
                                aria-label={`Explore ${category}`}
                                className="group flex min-h-20 items-center gap-5 border-b border-border py-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                                href="/services"
                            >
                                <span className="font-heading text-lg text-primary/70">
                                    0{index + 1}
                                </span>
                                <span className="flex-1 font-heading text-2xl font-medium text-foreground transition-colors group-hover:text-primary sm:text-3xl">
                                    {category}
                                </span>
                                <span
                                    aria-hidden="true"
                                    className="grid size-10 place-items-center rounded-full border border-border text-primary transition group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
                                >
                                    &rarr;
                                </span>
                            </Link>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
