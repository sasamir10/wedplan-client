import type { Metadata } from "next";
import { ServicesBrowser } from "./ServicesBrowser";

export const metadata: Metadata = { title: "Browse Services" };

export default function ServicesPage() {
    return <ServicesBrowser />;
}
