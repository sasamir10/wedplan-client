import type { Metadata } from "next";
import { Cormorant_Garamond, Geist } from "next/font/google";
import { Footer } from "./components/Footer";
import { Navbar } from "./components/Navbar";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
    variable: "--font-cormorant",
    subsets: ["latin"],
    weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
    applicationName: "WedPlan",
    title: {
        default: "WedPlan",
        template: "%s | WedPlan",
    },
    description:
        "Discover trusted wedding vendors and thoughtfully plan every detail of your celebration with WedPlan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${cormorant.variable}`}
        >
            <body className="min-h-screen flex flex-col">
                <a
                    className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-surface focus:px-4 focus:py-3 focus:text-foreground focus:shadow-soft"
                    href="#main-content"
                >
                    Skip to content
                </a>
                <Navbar />
                <main className="flex-1" id="main-content">
                    {children}
                </main>
                <Footer />
            </body>
        </html>
    );
}
