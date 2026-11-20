import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const steps = [
    {
        number: "01",
        title: "Discover Services",
        description:
            "Explore the types of wedding professionals and services that fit your plans.",
    },
    {
        number: "02",
        title: "Compare Options",
        description:
            "Review the details, starting prices and locations as you decide what feels right.",
    },
    {
        number: "03",
        title: "Submit Booking Request",
        description:
            "When you are ready, send a request to begin a conversation about your celebration.",
    },
];

export function HowItWorksSection() {
    return (
        <section className="bg-surface-secondary py-section" id="how-it-works">
            <div className="page-shell">
                <SectionHeading
                    align="center"
                    description="A clear path from the first idea to a conversation with the right service provider."
                    eyebrow="The journey"
                    title="Three thoughtful steps"
                />
                <div className="relative mt-12 grid gap-5 md:grid-cols-3">
                    <div
                        aria-hidden="true"
                        className="absolute left-[16%] right-[16%] top-6 hidden border-t border-dashed border-primary/30 md:block"
                    />
                    {steps.map((step, index) => (
                        <Reveal delay={index * 0.08} key={step.number}>
                            <article className="relative h-full rounded-2xl border border-border bg-background p-7 sm:p-8">
                                <span className="relative z-10 grid size-12 place-items-center rounded-full border border-primary/20 bg-background font-heading text-lg text-primary">
                                    {step.number}
                                </span>
                                <h3 className="mt-6 font-heading text-2xl font-medium text-foreground">
                                    {step.title}
                                </h3>
                                <p className="mt-3 text-sm leading-6 text-muted">
                                    {step.description}
                                </p>
                            </article>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
