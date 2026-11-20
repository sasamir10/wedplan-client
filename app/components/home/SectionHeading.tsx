type SectionHeadingProps = {
    eyebrow: string;
    title: string;
    description?: string;
    align?: "left" | "center";
};

export function SectionHeading({
    eyebrow,
    title,
    description,
    align = "left",
}: SectionHeadingProps) {
    const alignment =
        align === "center"
            ? "mx-auto text-center items-center"
            : "text-left items-start";

    return (
        <div className={`flex max-w-2xl flex-col ${alignment}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {eyebrow}
            </p>
            <h2 className="mt-4 font-heading text-4xl font-medium leading-tight text-foreground sm:text-5xl">
                {title}
            </h2>
            {description ? (
                <p className="mt-4 max-w-xl text-base leading-7 text-muted">
                    {description}
                </p>
            ) : null}
        </div>
    );
}
