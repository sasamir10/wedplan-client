import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

const benefits = [
    {
        number: "01",
        title: "Begin with your vision",
        description:
            "Shape a celebration that feels like you, then explore the services that can bring it to life.",
    },
    {
        number: "02",
        title: "Compare at your pace",
        description:
            "Give yourself room to consider locations, starting prices and the details that matter to you.",
    },
    {
        number: "03",
        title: "Keep the day in view",
        description:
            "Move from the first idea toward a thoughtful plan, one decision and one conversation at a time.",
    },
];

export function WhyWedPlanSection() {
    return (
        <section className="py-section">
            <div className="page-shell">
                <SectionHeading
                    align="center"
                    description="Wedding planning has many moving parts. WedPlan is being shaped to make the first steps feel a little clearer."
                    eyebrow="Why WedPlan"
                    title="More meaning. A little less overwhelm."
                />
                <div className="mt-12 grid gap-5 md:grid-cols-3">
                    {benefits.map((benefit, index) => (
                        <Reveal delay={index * 0.08} key={benefit.number}>
                            <article className="h-full rounded-2xl border border-border bg-surface p-7 shadow-soft sm:p-8">
                                <span className="grid size-11 place-items-center rounded-full bg-secondary/30 font-heading text-lg text-primary">
                                    {benefit.number}
                                </span>
                                <h3 className="mt-6 font-heading text-2xl font-medium text-foreground">
                                    {benefit.title}
                                </h3>
                                <p className="mt-3 text-sm leading-6 text-muted">
                                    {benefit.description}
                                </p>
                            </article>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
