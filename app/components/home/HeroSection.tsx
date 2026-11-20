import Image from "next/image";
import Link from "next/link";
import { Reveal } from "./Reveal";

export function HeroSection() {
    return (
        <section className="page-shell py-6 sm:py-8 lg:py-10">
            <div className="relative isolate min-h-144 overflow-hidden rounded-3xl bg-surface-secondary shadow-card sm:min-h-152 lg:min-h-160">
                <div className="absolute inset-y-0 right-0 w-[78%] sm:w-[68%] lg:w-[64%]">
                    <Image
                        alt="A couple sharing a quiet moment at an intimate garden wedding reception"
                        className="object-cover object-[68%_center]"
                        fill
                        priority
                        sizes="(max-width: 640px) 78vw, (max-width: 1024px) 68vw, 52vw"
                        src="/images/hero-wedding.webp"
                    />
                    <div className="absolute inset-0 bg-linear-to-r from-surface-secondary via-surface-secondary/80 to-transparent" />
                    <div className="absolute inset-0 bg-linear-to-t from-foreground/20 via-transparent to-transparent lg:hidden" />
                </div>
                <div className="relative z-10 flex min-h-144 items-center px-7 py-14 sm:min-h-152 sm:px-12 lg:min-h-160 lg:px-16">
                    <Reveal className="max-w-2xl">
                        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary backdrop-blur">
                            <span
                                aria-hidden="true"
                                className="size-1.5 rounded-full bg-secondary"
                            />
                            A thoughtful way to plan
                        </p>
                        <h1 className="max-w-xl font-heading text-5xl font-medium leading-[0.98] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                            Your day, your way.{" "}
                            <span className="text-primary">
                                Beautifully planned.
                            </span>
                        </h1>
                        <p className="mt-6 max-w-lg text-base leading-7 text-foreground/80 sm:text-lg sm:leading-8">
                            Find the people, places and finishing touches that
                            bring your celebration to life, all in one
                            considered place.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link
                                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-soft transition hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                                href="/services"
                            >
                                Explore Services{" "}
                                <span aria-hidden="true">&rarr;</span>
                            </Link>
                            <Link
                                className="inline-flex min-h-12 items-center justify-center rounded-full border border-foreground/20 bg-background/70 px-6 font-semibold text-foreground transition hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                                href="/for-vendors"
                            >
                                Become a Vendor
                            </Link>
                        </div>
                        <p className="mt-8 text-sm text-muted">
                            For the big decisions, and every lovely detail in
                            between.
                        </p>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
