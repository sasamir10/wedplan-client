"use client";

import { Alert, Button, Input, TextArea } from "@heroui/react";
import { useRef, useState, type FormEvent } from "react";
import { authenticatedApiRequest } from "@/lib/authenticated-api";
import {
    bookingFormSchema,
    type BookingFormPayload,
} from "@/lib/validations/booking";

const fieldClassName =
    "w-full rounded-xl border border-field-border bg-field-background px-4 py-3 text-sm text-field-foreground shadow-field outline-none transition placeholder:text-field-placeholder focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-65";

const panelClassName =
    "rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-7";

type FieldErrors = Partial<Record<keyof BookingFormPayload, string>>;
type Notice = { kind: "success" | "error"; message: string } | null;

const initialValues = {
    eventDate: "",
    eventLocation: "",
    message: "",
} as { eventDate: string; eventLocation: string; message: string };

function bookingErrorMessage(status: number, code?: string): string {
    if (status === 401) return "Please sign in again to book this service.";
    if (status === 403)
        return "This account isn't allowed to submit booking requests.";
    if (status === 404) return "This service is not available for booking.";
    if (status === 409) {
        if (code === "OWN_SERVICE_BOOKING")
            return "You cannot book your own service.";
        if (code === "DUPLICATE_BOOKING")
            return "An active booking already exists for this service and date.";
        return "This booking could not be processed. Please try again.";
    }
    if (status === 400) return "Please review the booking details and try again.";
    return "The booking could not be submitted. Please try again.";
}

function StatusAlert({ notice }: { notice: Notice }) {
    if (!notice) return null;

    return (
        <Alert
            aria-live="assertive"
            className="mb-6 rounded-xl"
            role="alert"
            status={notice.kind === "error" ? "danger" : "success"}
        >
            {notice.message}
        </Alert>
    );
}

function FieldError({ id, message }: { id: string; message?: string }) {
    if (!message) return null;

    return (
        <p className="mt-2 text-sm text-red-700" id={id} role="alert">
            {message}
        </p>
    );
}

export function BookingForm({ serviceId }: { serviceId: string }) {
    const [values, setValues] = useState<{
        eventDate: string;
        eventLocation: string;
        message: string;
    }>(initialValues);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [notice, setNotice] = useState<Notice>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const submitLock = useRef(false);
    const formRef = useRef<HTMLFormElement>(null);

    function updateField<K extends keyof typeof values>(
        field: K,
        value: (typeof values)[K],
    ) {
        setValues((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
        setNotice(null);
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitLock.current) return;

        const result = bookingFormSchema.safeParse({
            ...values,
            serviceId,
        });

        if (!result.success) {
            const nextErrors: FieldErrors = {};
            result.error.issues.forEach((issue) => {
                const field = issue.path[0];
                if (
                    typeof field === "string" &&
                    ["serviceId", "eventDate", "eventLocation", "message"].includes(
                        field,
                    )
                ) {
                    nextErrors[field as keyof BookingFormPayload] =
                        issue.message;
                }
            });
            setErrors(nextErrors);
            setNotice({
                kind: "error",
                message: "Please review the highlighted fields.",
            });
            return;
        }

        submitLock.current = true;
        setIsSubmitting(true);
        setErrors({});
        setNotice(null);

        const payload: BookingFormPayload = result.data;

        void authenticatedApiRequest(
            "/api/customer/bookings",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            },
        )
            .then(async (response) => {
                if (!response.ok) {
                    let errorCode: string | undefined;
                    try {
                        const errorPayload: unknown = await response.json();
                        const error = (
                            errorPayload as { error?: unknown }
                        ).error;
                        if (
                            typeof error === "object" &&
                            error !== null
                        ) {
                            const code = (error as { code?: unknown }).code;
                            errorCode =
                                typeof code === "string" ? code : undefined;
                        }
                    } catch {
                        errorCode = undefined;
                    }
                    setNotice({
                        kind: "error",
                        message: bookingErrorMessage(
                            response.status,
                            errorCode,
                        ),
                    });
                    return;
                }

                setSubmitted(true);
                setNotice({
                    kind: "success",
                    message:
                        "Your booking request has been submitted successfully.",
                });
            })
            .catch(() => {
                setNotice({
                    kind: "error",
                    message:
                        "We couldn't reach WedPlan. Check your connection and try again.",
                });
            })
            .finally(() => {
                submitLock.current = false;
                setIsSubmitting(false);
            });
    }

    if (submitted) {
        return (
            <section
                aria-labelledby="booking-heading"
                className={panelClassName}
            >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Booking request submitted
                </p>
                <h2 className="mt-3 font-heading text-3xl text-foreground" id="booking-heading">
                    Booking request submitted
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                    Your booking request has been received and is pending review.
                    The vendor will respond to your request.
                </p>
            </section>
        );
    }

    const isBusy = isSubmitting;

    return (
        <section aria-labelledby="booking-heading" className={panelClassName}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Booking
            </p>
            <h2 className="mt-3 font-heading text-3xl text-foreground" id="booking-heading">
                Request this service
            </h2>
            <StatusAlert notice={notice} />

            <form
                aria-busy={isBusy}
                className="mt-4 space-y-4 rounded-xl border border-border bg-surface p-5 shadow-soft sm:p-6"
                noValidate
                onSubmit={handleSubmit}
                ref={formRef}
            >
                <div>
                    <label
                        className="mb-2 block text-sm font-medium text-foreground"
                        htmlFor="eventDate"
                    >
                        Event date{" "}
                        <span aria-hidden="true" className="text-primary">
                            *
                        </span>
                    </label>
                    <Input
                        className={fieldClassName}
                        disabled={isBusy}
                        id="eventDate"
                        name="eventDate"
                        onChange={(event) =>
                            updateField("eventDate", event.currentTarget.value)
                        }
                        placeholder="YYYY-MM-DD"
                        type="date"
                        value={values.eventDate}
                        aria-invalid={Boolean(errors.eventDate)}
                        aria-describedby={
                            errors.eventDate ? "eventDate-error" : undefined
                        }
                    />
                    <FieldError
                        id="eventDate-error"
                        message={errors.eventDate}
                    />
                </div>

                <div>
                    <label
                        className="mb-2 block text-sm font-medium text-foreground"
                        htmlFor="eventLocation"
                    >
                        Event location{" "}
                        <span aria-hidden="true" className="text-primary">
                            *
                        </span>
                    </label>
                    <Input
                        className={fieldClassName}
                        disabled={isBusy}
                        id="eventLocation"
                        name="eventLocation"
                        onChange={(event) =>
                            updateField(
                                "eventLocation",
                                event.currentTarget.value,
                            )
                        }
                        placeholder="e.g. Dhaka, Bangladesh"
                        value={values.eventLocation}
                        aria-invalid={Boolean(errors.eventLocation)}
                        aria-describedby={
                            errors.eventLocation ? "eventLocation-error" : undefined
                        }
                    />
                    <FieldError
                        id="eventLocation-error"
                        message={errors.eventLocation}
                    />
                </div>

                <div>
                    <label
                        className="mb-2 block text-sm font-medium text-foreground"
                        htmlFor="message"
                    >
                        Additional message
                    </label>
                    <TextArea
                        aria-describedby={
                            errors.message ? "message-error" : undefined
                        }
                        aria-invalid={Boolean(errors.message)}
                        className={`${fieldClassName} min-h-24 resize-y`}
                        disabled={isBusy}
                        id="message"
                        maxLength={1000}
                        name="message"
                        onChange={(event) =>
                            updateField("message", event.currentTarget.value)
                        }
                        placeholder="Anything special the vendor should know?"
                        value={values.message}
                    />
                    <FieldError id="message-error" message={errors.message} />
                </div>

                <Button
                    className="w-full sm:w-auto sm:min-w-56"
                    isDisabled={isBusy || submitted}
                    onPress={() => formRef.current?.requestSubmit()}
                    size="lg"
                    type="button"
                    variant="primary"
                >
                    {isSubmitting
                        ? "Submitting booking request…"
                        : "Request this service"}
                </Button>
                <p className="mt-3 text-xs leading-5 text-muted">
                    Your event date, location, and message will be shared with the
                    vendor. This booking starts as Pending and can be cancelled before
                    it is accepted.
                </p>
            </form>
        </section>
    );
}
