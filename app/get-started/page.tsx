"use client";

import {
    registrationSchema,
    type RegistrationInput,
} from "@/lib/validations/auth";
import { authClient } from "@/lib/auth-client";
import { dashboardPathForRole } from "@/lib/auth-navigation";
import { toast } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

const initialFormData: RegistrationInput = {
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "customer",
    businessName: "",
};

type RegistrationErrors = Partial<Record<keyof RegistrationInput, string>>;
type BetterAuthError = {
    code?: string;
    message?: string;
    status?: number;
};

function getSafeSignupError(error: BetterAuthError): {
    message: string;
    field?: keyof RegistrationInput;
} {
    if (
        error.code === "USER_ALREADY_EXISTS" ||
        error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
    ) {
        return {
            field: "email",
            message: "This email already has an account. Sign in or use another email.",
        };
    }

    if (error.code === "INVALID_EMAIL") {
        return {
            field: "email",
            message: "Please enter a valid email address.",
        };
    }

    if (
        error.code === "PASSWORD_TOO_SHORT" ||
        error.code === "PASSWORD_TOO_LONG" ||
        error.code === "INVALID_PASSWORD"
    ) {
        return {
            field: "password",
            message: "Please choose a valid password and try again.",
        };
    }

    if (error.message === "A valid business name is required for vendors.") {
        return {
            field: "businessName",
            message: "Enter a valid business name to continue as a vendor.",
        };
    }

    if (error.message === "Choose a valid signup role: customer or vendor.") {
        return {
            field: "role",
            message: "Choose whether you are joining as a customer or vendor.",
        };
    }

    if (error.status !== undefined && error.status >= 400 && error.status < 500) {
        return {
            message: "Please review your information and try again.",
        };
    }

    return {
        message: "We couldn't create your account right now. Please try again shortly.",
    };
}

export default function GetStartedPage() {
    const router = useRouter();
    const [formData, setFormData] =
        useState<RegistrationInput>(initialFormData);
    const [errors, setErrors] = useState<RegistrationErrors>({});
    const [statusMessage, setStatusMessage] = useState("");
    const [statusKind, setStatusKind] = useState<"success" | "error" | null>(
        null,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submissionLock = useRef(false);

    function updateField<K extends keyof RegistrationInput>(
        field: K,
        value: RegistrationInput[K],
    ) {
        setFormData((previous) => ({
            ...previous,
            [field]: value,
        }));

        setErrors((previous) => ({
            ...previous,
            [field]: undefined,
        }));

        setStatusMessage("");
        setStatusKind(null);
    }

    function showSignupError(error: BetterAuthError) {
        const safeError = getSafeSignupError(error);

        if (safeError.field) {
            setErrors({
                [safeError.field]: safeError.message,
            } as RegistrationErrors);
        }

        setStatusMessage(safeError.message);
        setStatusKind("error");
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (submissionLock.current) {
            return;
        }

        const result = registrationSchema.safeParse(formData);

        if (!result.success) {
            const validationErrors: RegistrationErrors = {};

            result.error.issues.forEach((issue) => {
                const field = issue.path[0] as keyof RegistrationInput;

                if (!validationErrors[field]) {
                    validationErrors[field] = issue.message;
                }
            });

            setErrors(validationErrors);
            setStatusMessage("Please review the highlighted fields.");
            setStatusKind("error");
            return;
        }

        setErrors({});
        setStatusMessage("");
        setStatusKind(null);
        submissionLock.current = true;
        setIsSubmitting(true);

        try {
            const signupInput = {
                name: result.data.name,
                email: result.data.email,
                password: result.data.password,
                signupRole: result.data.role,
                ...(result.data.role === "vendor" && result.data.businessName
                    ? { signupBusinessName: result.data.businessName }
                    : {}),
            };

            const signupResult = await authClient.signUp.email(signupInput);

            if (signupResult.error) {
                showSignupError(signupResult.error);
                return;
            }

            const createdUser = signupResult.data?.user;

            if (!createdUser) {
                setStatusMessage(
                    "Your request was received, but we couldn't confirm account creation. Please try signing in or submit again.",
                );
                setStatusKind("error");
                return;
            }

            let authenticatedUser: typeof createdUser | null = null;
            try {
                const sessionResult = await authClient.getSession();
                const sessionUser = sessionResult.data?.user;
                if (
                    !sessionResult.error &&
                    sessionResult.data?.session &&
                    sessionUser?.id === createdUser.id
                ) {
                    authenticatedUser = sessionUser;
                }
            } catch {
                // Account creation can succeed even if session retrieval is temporarily unavailable.
            }

            const destination = authenticatedUser
                ? dashboardPathForRole(authenticatedUser.role)
                : null;

            if (destination && (destination === "/customer" || destination === "/vendor")) {
                toast.success("Your account is ready. Welcome to WedPlan.");
                router.replace(destination);
                router.refresh();
                return;
            }

            setStatusMessage("Your account has been created. Sign in to continue.");
            setStatusKind("success");
            toast.success("Your WedPlan account was created.");
            router.replace("/sign-in?registered=1");
        } catch {
            setStatusMessage(
                "We couldn't reach the account service. Check your connection and try again.",
            );
            setStatusKind("error");
        } finally {
            submissionLock.current = false;
            setIsSubmitting(false);
        }
    }

    const inputClass =
        "w-full rounded-xl border border-field-border bg-field-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

    function getError(field: keyof RegistrationInput) {
        return errors[field] ? (
            <p className="mt-1.5 text-sm text-red-600" role="alert">
                {errors[field]}
            </p>
        ) : null;
    }

    return (
        <main className="page-shell flex min-h-[80vh] items-center justify-center py-16">
            <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-8 shadow-soft sm:p-10">
                <div className="mb-8 text-center">
                    <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-primary">
                        Get Started
                    </p>

                    <h1 className="text-4xl text-foreground sm:text-5xl">
                        Create Your Account
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-muted">
                        Join WedPlan and make your wedding planning experience
                        easier.
                    </p>
                </div>

                <form
                    className="space-y-5"
                    onSubmit={handleSubmit}
                    noValidate
                    aria-busy={isSubmitting}
                >
                    <div>
                        <label
                            htmlFor="name"
                            className="mb-2 block text-sm font-medium"
                        >
                            Full Name
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={(event) =>
                                updateField("name", event.target.value)
                            }
                            placeholder="Enter your full name"
                            className={inputClass}
                            aria-invalid={Boolean(errors.name)}
                        />
                        {getError("name")}
                    </div>

                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-medium"
                        >
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={(event) =>
                                updateField("email", event.target.value)
                            }
                            placeholder="you@example.com"
                            className={inputClass}
                            aria-invalid={Boolean(errors.email)}
                        />
                        {getError("email")}
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-medium"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={(event) =>
                                updateField("password", event.target.value)
                            }
                            placeholder="Create a password"
                            className={inputClass}
                            aria-invalid={Boolean(errors.password)}
                        />
                        {getError("password")}
                    </div>

                    <div>
                        <label
                            htmlFor="confirmPassword"
                            className="mb-2 block text-sm font-medium"
                        >
                            Confirm Password
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(event) =>
                                updateField(
                                    "confirmPassword",
                                    event.target.value,
                                )
                            }
                            placeholder="Confirm your password"
                            className={inputClass}
                            aria-invalid={Boolean(errors.confirmPassword)}
                        />
                        {getError("confirmPassword")}
                    </div>

                    <div>
                        <label
                            htmlFor="role"
                            className="mb-2 block text-sm font-medium"
                        >
                            I want to join as
                        </label>
                        <select
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={(event) =>
                                updateField(
                                    "role",
                                    event.target.value as "customer" | "vendor",
                                )
                            }
                            className={inputClass}
                            aria-invalid={Boolean(errors.role)}
                        >
                            <option value="customer">Customer</option>
                            <option value="vendor">Vendor</option>
                        </select>
                        {getError("role")}
                    </div>

                    {formData.role === "vendor" && (
                        <div>
                            <label
                                htmlFor="businessName"
                                className="mb-2 block text-sm font-medium"
                            >
                                Business Name
                            </label>
                            <input
                                id="businessName"
                                name="businessName"
                                type="text"
                                value={formData.businessName ?? ""}
                                onChange={(event) =>
                                    updateField(
                                        "businessName",
                                        event.target.value,
                                    )
                                }
                                placeholder="Enter your business name"
                                className={inputClass}
                                aria-invalid={Boolean(errors.businessName)}
                            />
                            {getError("businessName")}
                        </div>
                    )}

                    {statusMessage && (
                        <div
                            className="rounded-xl bg-surface-secondary p-3 text-sm text-foreground"
                            role={statusKind === "error" ? "alert" : "status"}
                            aria-live={statusKind === "error" ? "assertive" : "polite"}
                        >
                            <p>{statusMessage}</p>
                            {statusKind === "success" && (
                                <div className="mt-2">
                                    <Link
                                        href="/sign-in"
                                        className="font-semibold text-primary underline-offset-4 hover:underline"
                                    >
                                        Sign in
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isSubmitting ? "Creating account..." : "Create Account"}
                    </button>
                </form>

                <p className="mt-7 text-center text-sm text-muted">
                    Already have an account?{" "}
                    <Link
                        href="/sign-in"
                        className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </main>
    );
}
