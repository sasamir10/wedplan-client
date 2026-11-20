import Link from "next/link";

type FeaturePageProps = {
    eyebrow: string;
    title: string;
    description: string;
};

export function FeaturePage({ eyebrow, title, description }: FeaturePageProps) {
    return (
        <div className="page-shell py-section">
            <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
                <p className="mb-5 rounded-full bg-secondary/35 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-foreground">
                    {eyebrow}
                </p>
                <h1 className="font-heading text-5xl font-medium leading-tight text-foreground sm:text-6xl">
                    {title}
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                    {description}
                </p>
                <Link
                    className="mt-9 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 font-medium text-primary-foreground shadow-soft transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                    href="/"
                >
                    Return home
                </Link>
            </section>
        </div>
    );
}
