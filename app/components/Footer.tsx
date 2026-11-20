import Link from "next/link";

const footerLinkClassName =
    "rounded-sm text-sm text-foreground/75 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus";

export function Footer() {
    return (
        <footer className="mt-auto border-t border-border bg-surface">
            <div className="page-shell grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr] lg:gap-10">
                <div className="space-y-4">
                    <Link
                        aria-label="WedPlan home"
                        className="inline-flex items-center gap-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                        href="/"
                    >
                        <span
                            aria-hidden="true"
                            className="grid size-9 place-items-center rounded-full border border-secondary text-lg text-primary"
                        >
                            <span className="font-heading">W</span>
                        </span>
                        <span className="font-heading text-2xl font-semibold text-foreground">
                            WedPlan
                        </span>
                    </Link>
                    <p className="max-w-xs text-sm leading-6 text-muted">
                        Thoughtful tools for finding your wedding team and bringing every detail
                        of your celebration together.
                    </p>
                </div>

                <nav aria-label="Explore WedPlan" className="space-y-4">
                    <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-foreground">
                        Explore
                    </h2>
                    <ul className="space-y-3">
                        <li><Link className={footerLinkClassName} href="/">Home</Link></li>
                        <li><Link className={footerLinkClassName} href="/services">Browse Services</Link></li>
                        <li><Link className={footerLinkClassName} href="/how-it-works">How It Works</Link></li>
                    </ul>
                </nav>

                <nav aria-label="Your WedPlan" className="space-y-4">
                    <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-foreground">
                        Your WedPlan
                    </h2>
                    <ul className="space-y-3">
                        <li><Link className={footerLinkClassName} href="/sign-in">Sign In</Link></li>
                        <li><Link className={footerLinkClassName} href="/get-started">Get Started</Link></li>
                        <li><Link className={footerLinkClassName} href="/for-vendors">For Wedding Vendors</Link></li>
                    </ul>
                </nav>

                <section aria-labelledby="footer-contact-heading" className="space-y-4">
                    <h2
                        className="font-sans text-xs font-semibold uppercase tracking-widest text-foreground"
                        id="footer-contact-heading"
                    >
                        Contact
                    </h2>
                    <p className="max-w-xs text-sm leading-6 text-muted">
                        For planning or vendor enquiries, please refer to the official WedPlan
                        support information.
                    </p>
                </section>
            </div>

            <div className="border-t border-border">
                <div className="page-shell flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
                    <p>Copyright (C) {new Date().getFullYear()} WedPlan. All rights reserved.</p>
                    <p>Made for the moments that matter.</p>
                </div>
            </div>
        </footer>
    );
}
