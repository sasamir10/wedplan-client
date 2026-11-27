import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign In" };

export default function SignInPage() {
    return (
        <Suspense
            fallback={
                <div className="page-shell flex min-h-[80vh] items-center justify-center py-16">
                    <p className="text-sm text-muted" role="status">
                        Preparing sign in…
                    </p>
                </div>
            }
        >
            <SignInForm />
        </Suspense>
    );
}
