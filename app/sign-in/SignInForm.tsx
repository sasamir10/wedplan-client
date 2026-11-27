"use client";

import { authClient } from "@/lib/auth-client";
import { dashboardPathForRole } from "@/lib/auth-navigation";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button, toast } from "@heroui/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

type LoginErrors = Partial<Record<keyof LoginInput, string>>;
type BetterAuthError = {
    code?: string;
    message?: string;
    status?: number;
};

const initialFormData: LoginInput = {
    email: "",
    password: "",
    rememberMe: true,
};

function getSafeLoginError(error: BetterAuthError): {
    message: string;
    field?: keyof LoginInput;
} {
    if (error.code === "INVALID_EMAIL_OR_PASSWORD" || error.status === 401) {
        return { message: "The email address or password is incorrect." };
    }
    if (error.code === "BANNED_USER") {
        return { message: "This account is unavailable. Please contact WedPlan support." };
    }
    if (error.code === "INVALID_EMAIL") {
        return { field: "email", message: "Please enter a valid email address." };
    }
    if (error.status !== undefined && error.status >= 400 && error.status < 500) {
        return { message: "We couldn't sign you in. Please check your details and try again." };
    }
    return { message: "Sign-in is temporarily unavailable. Please try again shortly." };
}

function getSafeGoogleError(error: BetterAuthError): string {
    if (error.code === "PROVIDER_NOT_FOUND") {
        return "Google sign-in is currently unavailable. Please use email and password instead.";
    }
    if (error.status !== undefined && error.status >= 400 && error.status < 500) {
        return "Google couldn't start sign-in. Please try again or use email and password.";
    }
    return "Google sign-in is temporarily unavailable. Please try again shortly.";
}

export function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const registeredNotice = searchParams.get("registered") === "1"
        ? "Your account was created. Sign in to continue."
        : "";
    const {
        data: currentSession,
        isPending: isSessionPending,
        error: sessionError,
    } = authClient.useSession();
    const [formData, setFormData] = useState<LoginInput>(initialFormData);
    const [errors, setErrors] = useState<LoginErrors>({});
    const [formError, setFormError] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [activeAttempt, setActiveAttempt] = useState<"email" | "google" | null>(null);
    const attemptLock = useRef(false);

    useEffect(() => {
        if (isSessionPending || sessionError || !currentSession?.user) return;

        const destination = dashboardPathForRole(currentSession.user.role);
        if (destination) {
            if (searchParams.get("auth") === "callback") {
                toast.success("You’re signed in to WedPlan.");
            }
            router.replace(destination);
            router.refresh();
        }
    }, [currentSession?.user, isSessionPending, router, searchParams, sessionError]);

    function updateField<K extends keyof LoginInput>(field: K, value: LoginInput[K]) {
        setFormData((previous) => ({ ...previous, [field]: value }));
        setErrors((previous) => ({ ...previous, [field]: undefined }));
        setFormError("");
    }

    async function handleEmailSignIn(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (attemptLock.current) return;

        const result = loginSchema.safeParse(formData);
        if (!result.success) {
            const validationErrors: LoginErrors = {};
            result.error.issues.forEach((issue) => {
                const field = issue.path[0] as keyof LoginInput;
                if (!validationErrors[field]) validationErrors[field] = issue.message;
            });
            setErrors(validationErrors);
            setFormError("Please review the highlighted fields.");
            return;
        }

        attemptLock.current = true;
        setActiveAttempt("email");
        setErrors({});
        setFormError("");

        try {
            const response = await authClient.signIn.email({
                email: result.data.email,
                password: result.data.password,
                rememberMe: result.data.rememberMe,
            });

            if (response.error) {
                const safeError = getSafeLoginError(response.error);
                if (safeError.field) {
                    setErrors({ [safeError.field]: safeError.message });
                }
                setFormError(safeError.message);
                return;
            }

            const sessionResponse = await authClient.getSession();
            if (
                sessionResponse.error ||
                !sessionResponse.data?.session ||
                !sessionResponse.data.user ||
                sessionResponse.data.user.id !== response.data.user.id
            ) {
                setFormError("We couldn't confirm your sign-in session. Please try again.");
                return;
            }

            const destination = dashboardPathForRole(sessionResponse.data.user.role);
            if (!destination) {
                setFormError("Your account role could not be verified. Please contact WedPlan support.");
                return;
            }

            toast.success("You’re signed in to WedPlan.");
            router.replace(destination);
            router.refresh();
        } catch {
            setFormError("Sign-in is temporarily unavailable. Check your connection and try again.");
        } finally {
            attemptLock.current = false;
            setActiveAttempt(null);
        }
    }

    async function handleGoogleSignIn() {
        if (attemptLock.current) return;

        attemptLock.current = true;
        setActiveAttempt("google");
        setFormError("");

        try {
            const callbackURL = new URL("/sign-in?auth=callback", window.location.origin).toString();
            const response = await authClient.signIn.social({
                provider: "google",
                callbackURL,
                disableRedirect: true,
            });

            if (response.error) {
                setFormError(getSafeGoogleError(response.error));
                return;
            }

            const authorizationURL = response.data?.url;
            if (!authorizationURL) {
                setFormError("Google sign-in couldn't be started. Please try again.");
                return;
            }

            window.location.assign(authorizationURL);
        } catch {
            setFormError("Google sign-in is temporarily unavailable. Check your connection and try again.");
        } finally {
            attemptLock.current = false;
            setActiveAttempt(null);
        }
    }

    const inputClass =
        "w-full rounded-xl border border-field-border bg-field-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70";

    return (
        <section className="page-shell flex min-h-[80vh] items-center justify-center py-16">
            <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-8 shadow-soft sm:p-10">
                <div className="mb-8 text-center">
                    <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-primary">
                        Welcome Back
                    </p>
                    <h1 className="font-heading text-4xl text-foreground sm:text-5xl">
                        Sign In to WedPlan
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-muted">
                        Continue planning your celebration with WedPlan.
                    </p>
                </div>

                <form className="space-y-5" onSubmit={handleEmailSignIn} noValidate aria-busy={activeAttempt !== null || isSessionPending}>
                    <div>
                        <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={formData.email}
                            onChange={(event) => updateField("email", event.target.value)}
                            placeholder="you@example.com"
                            className={inputClass}
                            aria-invalid={Boolean(errors.email)}
                            aria-describedby={errors.email ? "email-error" : undefined}
                            disabled={activeAttempt !== null}
                        />
                        {errors.email && (
                            <p id="email-error" className="mt-1.5 text-sm text-red-600" role="alert">
                                {errors.email}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="password" className="mb-2 block text-sm font-medium text-foreground">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={isPasswordVisible ? "text" : "password"}
                                autoComplete="current-password"
                                value={formData.password}
                                onChange={(event) => updateField("password", event.target.value)}
                                placeholder="Enter your password"
                                className={inputClass + " pr-20"}
                                aria-invalid={Boolean(errors.password)}
                                aria-describedby={errors.password ? "password-error" : undefined}
                                disabled={activeAttempt !== null}
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-3 my-auto h-fit rounded px-2 py-1 text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                onClick={() => setIsPasswordVisible((visible) => !visible)}
                                aria-controls="password"
                                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                            >
                                {isPasswordVisible ? "Hide" : "Show"}
                            </button>
                        </div>
                        {errors.password && (
                            <p id="password-error" className="mt-1.5 text-sm text-red-600" role="alert">
                                {errors.password}
                            </p>
                        )}
                    </div>

                    <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-foreground">
                        <input
                            type="checkbox"
                            name="rememberMe"
                            checked={formData.rememberMe}
                            onChange={(event) => updateField("rememberMe", event.target.checked)}
                            className="size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            disabled={activeAttempt !== null}
                        />
                        Remember me
                    </label>

                    {formError && (
                        <p className="rounded-xl bg-surface-secondary p-3 text-sm text-foreground" role="alert" aria-live="assertive">
                            {formError}
                        </p>
                    )}

                    {registeredNotice && (
                        <p className="rounded-xl bg-surface-secondary p-3 text-sm text-foreground" role="status" aria-live="polite">
                            {registeredNotice}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={activeAttempt !== null || isSessionPending || Boolean(currentSession?.user)}
                        className="w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {activeAttempt === "email" ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <div className="my-6 flex items-center gap-4">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-xs uppercase tracking-wider text-muted">or</span>
                    <span className="h-px flex-1 bg-border" />
                </div>

                <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    isDisabled={activeAttempt !== null || isSessionPending || Boolean(currentSession?.user)}
                    variant="outline"
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface px-5 py-3.5 text-sm font-medium text-foreground transition hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.91c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.39 37.96 46.98 31.83 46.98 24.55Z" />
                        <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.14 1.45-4.88 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
                    </svg>
                    {activeAttempt === "google" ? "Connecting to Google..." : "Continue with Google"}
                </Button>

                <p className="mt-7 text-center text-sm text-muted">
                    New to WedPlan?{" "}
                    <Link
                        href="/get-started"
                        className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        Create an account
                    </Link>
                </p>
            </div>
        </section>
    );
}
