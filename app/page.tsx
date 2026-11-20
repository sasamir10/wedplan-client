import type { Metadata } from "next";
import { HomePage } from "./components/home/HomePage";

export const metadata: Metadata = {
    title: "Wedding Planning, Thoughtfully Together",
    description:
        "Discover wedding services, compare options and bring your celebration together with WedPlan.",
};

export default function Home() {
    return <HomePage />;
}
