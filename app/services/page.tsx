import type { Metadata } from "next";
import { FeaturePage } from "../components/FeaturePage";

export const metadata: Metadata = { title: "Browse Services" };

export default function ServicesPage() {
    return (
        <FeaturePage
            description="Our service directory is being prepared. This page will help couples explore wedding professionals and find services suited to their celebration."
            eyebrow="Browse services"
            title="Find the right people for your celebration"
        />
    );
}
