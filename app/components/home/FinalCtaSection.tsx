import Link from "next/link";
import { Reveal } from "./Reveal";

export function FinalCtaSection() {
    return (
        <section className="page-shell py-section">
            <Reveal>
                <div className="relative isolate overflow-hidden rounded-3xl bg-primary px-7 py-12 text-primary-foreground shadow-card sm:px-12 sm:py-16 lg:px-16">
                    <div
                        aria-hidden="true"
                        className="absolute -right-20 -top-28 -z-10 size-80 rounded-full border border-primary-foreground/15"
                    />
                    <div
                        aria-hidden="true"
                        className="absolute -right-8 -top-16 -z-10 size-56 rounded-full border border-secondary/40"
                    />
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
                            Your celebration starts with an idea
                        </p>
                        <h2 className="mt-4 font-heading text-4xl font-medium leading-tight sm:text-5xl lg:text-6xl">
                            Let the planning feel like part of the joy.
                        </h2>
                        <p className="mt-5 max-w-2xl text-base leading-7 text-primary-foreground/85">
                            Explore the sample service directory, or learn how
                            wedding professionals can be part of the WedPlan
                            marketplace.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link
                                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-background px-6 font-semibold text-primary transition hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-background"
                                href="/services"
                            >
                                Explore Services{" "}
                                <span aria-hidden="true">&rarr;</span>
                            </Link>
                            <Link
                                className="inline-flex min-h-12 items-center justify-center rounded-full border border-primary-foreground/35 px-6 font-semibold text-primary-foreground transition hover:border-secondary hover:text-secondary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-background"
                                href="/for-vendors"
                            >
                                For Wedding Vendors
                            </Link>
                        </div>
                    </div>
                </div>
            </Reveal>
        </section>
    );
}
