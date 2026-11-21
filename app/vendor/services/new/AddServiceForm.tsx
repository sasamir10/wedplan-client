"use client";

import { authClient } from "@/lib/auth-client";
import { authenticatedApiRequest } from "@/lib/authenticated-api";
import {
    serviceCategories,
    uploadedServiceImageResponseSchema,
    vendorServiceResponseEnvelopeSchema,
    vendorServiceSchema,
    type ServiceCategory,
} from "@/lib/validations/service";
import { Alert, Button, Input, TextArea } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";

const MAX_SERVICE_IMAGES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type ServiceFormValues = {
    serviceName: string;
    category: ServiceCategory | "";
    description: string;
    price: string;
    location: string;
};

type ImageState = "queued" | "uploading" | "uploaded" | "failed";

type SelectedImage = {
    id: string;
    file: File;
    previewUrl: string;
    state: ImageState;
    hostedUrl?: string;
    error?: string;
};

type FormField = keyof ServiceFormValues | "images";
type FieldErrors = Partial<Record<FormField, string>>;
type Notice = { kind: "success" | "error" | "info"; message: string } | null;

const initialValues: ServiceFormValues = {
    serviceName: "",
    category: "",
    description: "",
    price: "",
    location: "",
};

const fieldClassName =
    "w-full rounded-xl border border-field-border bg-field-background px-4 py-3 text-sm text-field-foreground shadow-field outline-none transition placeholder:text-field-placeholder focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-65";

function uploadErrorMessage(status: number): string {
    if (status === 401) return "Please sign in again before uploading images.";
    if (status === 403)
        return "Image uploads are available to vendor accounts.";
    if (status === 413) return "Each image must be 10 MB or smaller.";
    if (status === 415) return "Choose a JPG, PNG, or WebP image.";
    if (status === 503) return "Image uploads are not configured on this server yet. Please contact WedPlan support.";
    if (status === 502 || status === 504) {
        return "The image service could not complete the upload. Please try again.";
    }
    if (status === 400)
        return "This file could not be verified as a supported image.";
    return "The image could not be uploaded. Please try again.";
}

function readServiceErrorCode(payload: unknown): string | undefined {
    if (typeof payload !== "object" || payload === null) return undefined;
    const error = (payload as { error?: unknown }).error;
    if (typeof error !== "object" || error === null) return undefined;
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
}

function serviceErrorMessage(status: number, code?: string): string {
    if (status === 401)
        return "Your session has expired. Sign in and try again.";
    if (status === 403) {
        if (code === "ROLE_FORBIDDEN")
            return "Only vendor accounts can add services.";
        if (code === "VENDOR_NOT_FOUND")
            return "We couldn't find your vendor account. Please sign in again or contact WedPlan support.";
        if (code === "VENDOR_ACCOUNT_UNAVAILABLE")
            return "We couldn't confirm your vendor account. Please sign in again or contact WedPlan support.";
        if (code === "SUBSCRIPTION_UNVERIFIED")
            return "We couldn't verify your subscription plan. Please contact WedPlan support.";
        return "This account isn't allowed to add services right now. Please contact WedPlan support if this continues.";
    }
    if (status === 409) {
        if (code === "FREE_PLAN_LIMIT_REACHED")
            return "Your Free plan allows up to 3 active services. Deactivate a service or upgrade to add another.";
        return "Your current plan has reached its active service limit.";
    }
    if (status === 503)
        return "The service is temporarily unavailable. Try again shortly.";
    return "We couldn't save your service. Please review the form and try again.";
}

function StatusAlert({ notice }: { notice: Notice }) {
    if (!notice) return null;

    const status =
        notice.kind === "success"
            ? "success"
            : notice.kind === "info"
              ? "accent"
              : "danger";

    return (
        <Alert
            aria-live={notice.kind === "error" ? "assertive" : "polite"}
            className="mb-6 rounded-xl"
            role={notice.kind === "error" ? "alert" : "status"}
            status={status}
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

export function AddServiceForm() {
    const router = useRouter();
    const {
        data: sessionData,
        isPending: isSessionPending,
        error: sessionError,
    } = authClient.useSession();
    const [values, setValues] = useState(initialValues);
    const [images, setImages] = useState<SelectedImage[]>([]);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [notice, setNotice] = useState<Notice>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isServiceSubmitted, setIsServiceSubmitted] = useState(false);
    const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const uploadLock = useRef(false);
    const submitLock = useRef(false);
    const previewUrls = useRef(new Set<string>());
    const redirectTimer = useRef<number | null>(null);

    useEffect(
        () => () => {
            for (const previewUrl of previewUrls.current) {
                URL.revokeObjectURL(previewUrl);
            }
            if (redirectTimer.current !== null) {
                window.clearTimeout(redirectTimer.current);
            }
        },
        [],
    );

    function updateField<K extends keyof ServiceFormValues>(
        field: K,
        value: ServiceFormValues[K],
    ) {
        setValues((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
        setNotice(null);
    }

    function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
        const selectedFiles = Array.from(event.currentTarget.files ?? []);
        event.currentTarget.value = "";
        if (selectedFiles.length === 0) return;

        const availableSlots = MAX_SERVICE_IMAGES - images.length;
        const accepted: SelectedImage[] = [];
        const rejected: string[] = [];

        for (const file of selectedFiles) {
            if (accepted.length >= availableSlots) {
                rejected.push(
                    `You can add up to ${MAX_SERVICE_IMAGES} images.`,
                );
                break;
            }
            if (!supportedImageTypes.has(file.type)) {
                rejected.push(`${file.name}: choose a JPG, PNG, or WebP file.`);
                continue;
            }
            if (file.size > MAX_IMAGE_BYTES) {
                rejected.push(
                    `${file.name}: each image must be 10 MB or smaller.`,
                );
                continue;
            }

            const previewUrl = URL.createObjectURL(file);
            previewUrls.current.add(previewUrl);
            accepted.push({
                id: globalThis.crypto.randomUUID(),
                file,
                previewUrl,
                state: "queued",
            });
        }

        if (accepted.length > 0) {
            setImages((current) => [...current, ...accepted]);
            setErrors((current) => ({ ...current, images: undefined }));
        }

        setNotice(
            rejected.length > 0
                ? { kind: "error", message: rejected.join(" ") }
                : null,
        );
    }

    function removeImage(imageId: string) {
        const image = images.find((item) => item.id === imageId);
        if (!image || image.state === "uploading") return;

        URL.revokeObjectURL(image.previewUrl);
        previewUrls.current.delete(image.previewUrl);
        setImages((current) => current.filter((item) => item.id !== imageId));
        setErrors((current) => ({ ...current, images: undefined }));
        setNotice(null);
    }

    async function uploadOneImage(image: SelectedImage): Promise<boolean> {
        setActiveUploadId(image.id);
        setImages((current) =>
            current.map((item) =>
                item.id === image.id
                    ? { ...item, state: "uploading", error: undefined }
                    : item,
            ),
        );

        let safeErrorMessage =
            "The image could not be uploaded. Check your connection and try again.";

        try {
            const formData = new FormData();
            formData.append("image", image.file);

            const response = await authenticatedApiRequest(
                "/api/vendor/services/upload-image",
                { method: "POST", body: formData },
            );

            if (!response.ok) {
                safeErrorMessage = uploadErrorMessage(response.status);
                throw new Error("Image upload failed");
            }

            const payload: unknown = await response.json();
            const result =
                uploadedServiceImageResponseSchema.safeParse(payload);
            if (!result.success) {
                safeErrorMessage =
                    "The image service returned an invalid response.";
                throw new Error("Image upload response was invalid");
            }

            setImages((current) =>
                current.map((item) =>
                    item.id === image.id
                        ? {
                              ...item,
                              state: "uploaded",
                              hostedUrl: result.data.image.url,
                          }
                        : item,
                ),
            );
            return true;
        } catch {
            setImages((current) =>
                current.map((item) =>
                    item.id === image.id
                        ? { ...item, state: "failed", error: safeErrorMessage }
                        : item,
                ),
            );
            return false;
        } finally {
            setActiveUploadId(null);
        }
    }

    async function uploadPendingImages() {
        if (uploadLock.current || isSubmitting) return;

        const pendingImages = images.filter(
            (image) => image.state === "queued" || image.state === "failed",
        );
        if (pendingImages.length === 0) return;

        uploadLock.current = true;
        setIsUploading(true);
        setNotice({ kind: "info", message: "Uploading your images securely…" });

        let failedCount = 0;
        try {
            for (const image of pendingImages) {
                if (!(await uploadOneImage(image))) failedCount += 1;
            }
        } finally {
            uploadLock.current = false;
            setIsUploading(false);
            setActiveUploadId(null);
            setNotice(
                failedCount > 0
                    ? {
                          kind: "error",
                          message:
                              "Some images could not be uploaded. Retry them or remove them before saving.",
                      }
                    : {
                          kind: "success",
                          message: "All selected images are uploaded.",
                      },
            );
        }
    }

    function applyValidationErrors(
        issues: Array<{ path: PropertyKey[]; message: string }>,
    ) {
        const nextErrors: FieldErrors = {};
        for (const issue of issues) {
            const field = issue.path[0];
            if (
                typeof field === "string" &&
                [
                    "serviceName",
                    "category",
                    "description",
                    "price",
                    "location",
                    "images",
                ].includes(field) &&
                !nextErrors[field as FormField]
            ) {
                nextErrors[field as FormField] = issue.message;
            }
        }
        setErrors(nextErrors);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (submitLock.current || uploadLock.current) return;

        const hostedUrls = images
            .filter((image) => image.state === "uploaded" && image.hostedUrl)
            .map((image) => image.hostedUrl as string);

        if (images.some((image) => image.state !== "uploaded")) {
            setErrors((current) => ({
                ...current,
                images: "Upload or remove each selected image before saving.",
            }));
            return;
        }

        const result = vendorServiceSchema.safeParse({
            ...values,
            images: hostedUrls,
        });

        if (!result.success) {
            applyValidationErrors(result.error.issues);
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

        try {
            const response = await authenticatedApiRequest(
                "/api/vendor/services",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(result.data),
                },
            );

            if (!response.ok) {
                let errorCode: string | undefined;
                try {
                    errorCode = readServiceErrorCode(await response.json());
                } catch {
                    errorCode = undefined;
                }
                setNotice({
                    kind: "error",
                    message: serviceErrorMessage(response.status, errorCode),
                });
                return;
            }

            const payload: unknown = await response.json();
            const createdService =
                vendorServiceResponseEnvelopeSchema.safeParse(payload);
            if (
                !createdService.success ||
                createdService.data.service.status !== "Pending"
            ) {
                setNotice({
                    kind: "error",
                    message:
                        "The server response could not be verified. Please check My Services before trying again.",
                });
                return;
            }

            setIsServiceSubmitted(true);
            setNotice({
                kind: "success",
                message:
                    "Your service was submitted and is now awaiting WedPlan review. Returning to My Services shortly.",
            });
            redirectTimer.current = window.setTimeout(() => {
                router.replace("/vendor/services");
            }, 1800);
        } catch {
            setNotice({
                kind: "error",
                message:
                    "We couldn't reach WedPlan. Check your connection and try again.",
            });
        } finally {
            submitLock.current = false;
            setIsSubmitting(false);
        }
    }

    const uploadedCount = images.filter(
        (image) => image.state === "uploaded",
    ).length;
    const pendingCount = images.filter(
        (image) => image.state === "queued" || image.state === "failed",
    ).length;
    const progressValue =
        images.length === 0 ? 0 : (uploadedCount / images.length) * 100;
    const isVendor = sessionData?.user?.role === "vendor";

    if (isSessionPending) {
        return (
            <div className="page-shell flex min-h-[60vh] items-center justify-center py-16">
                <p className="text-sm text-muted" role="status">
                    Checking your WedPlan session…
                </p>
            </div>
        );
    }

    if (sessionError || !sessionData?.user || !isVendor) {
        const signedIn = Boolean(sessionData?.user);
        return (
            <div className="page-shell flex min-h-[65vh] items-center justify-center py-16">
                <section className="w-full max-w-xl rounded-3xl border border-border bg-surface p-8 text-center shadow-soft sm:p-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                        Vendor workspace
                    </p>
                    <h1 className="mt-3 font-heading text-4xl text-foreground sm:text-5xl">
                        {signedIn
                            ? "Vendor access required"
                            : "Sign in to continue"}
                    </h1>
                    <p className="mt-4 leading-7 text-muted">
                        {signedIn
                            ? "This page is for vendor accounts. The server also checks your account before accepting uploads or service details."
                            : "Sign in with your vendor account to add a service to WedPlan."}
                    </p>
                    <Link
                        className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                        href={signedIn ? "/" : "/sign-in"}
                    >
                        {signedIn ? "Return home" : "Sign in"}
                    </Link>
                </section>
            </div>
        );
    }

    const isBusy = isUploading || isSubmitting;

    return (
        <div className="page-shell py-10 sm:py-14 lg:py-16">
            <div className="mx-auto max-w-6xl">
                <header className="mb-8 max-w-3xl sm:mb-10">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                        Vendor workspace
                    </p>
                    <h1 className="font-heading text-4xl font-medium leading-tight text-foreground sm:text-5xl lg:text-6xl">
                        Add your wedding service
                    </h1>
                    <Link
                        className="mt-4 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                        href="/vendor/services"
                    >
                        View My Services
                    </Link>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                        Tell couples what you offer, where you work, and what
                        they can expect. Your new listing will be sent for
                        review before it is approved.
                    </p>
                </header>

                <StatusAlert notice={notice} />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
                    <form
                        aria-busy={isBusy}
                        className="rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-8"
                        noValidate
                        onSubmit={handleSubmit}
                        ref={formRef}
                    >
                        <div className="mb-7 border-b border-border pb-6">
                            <h2 className="font-heading text-3xl text-foreground">
                                Service details
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-muted">
                                Fields marked required are needed to create your
                                listing.
                            </p>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label
                                    className="mb-2 block text-sm font-medium text-foreground"
                                    htmlFor="serviceName"
                                >
                                    Service name{" "}
                                    <span
                                        aria-hidden="true"
                                        className="text-primary"
                                    >
                                        *
                                    </span>
                                </label>
                                <Input
                                    autoComplete="organization-title"
                                    className={fieldClassName}
                                    disabled={isBusy || isSubmitting}
                                    id="serviceName"
                                    maxLength={120}
                                    name="serviceName"
                                    onChange={(event) =>
                                        updateField(
                                            "serviceName",
                                            event.currentTarget.value,
                                        )
                                    }
                                    placeholder="e.g. Full-day wedding photography"
                                    value={values.serviceName}
                                    aria-invalid={Boolean(errors.serviceName)}
                                    aria-describedby={
                                        errors.serviceName
                                            ? "serviceName-error"
                                            : undefined
                                    }
                                />
                                <FieldError
                                    id="serviceName-error"
                                    message={errors.serviceName}
                                />
                            </div>

                            <div>
                                <label
                                    className="mb-2 block text-sm font-medium text-foreground"
                                    htmlFor="category"
                                >
                                    Service category{" "}
                                    <span
                                        aria-hidden="true"
                                        className="text-primary"
                                    >
                                        *
                                    </span>
                                </label>
                                <select
                                    aria-describedby={
                                        errors.category
                                            ? "category-error"
                                            : undefined
                                    }
                                    aria-invalid={Boolean(errors.category)}
                                    className={`${fieldClassName} h-12 appearance-none`}
                                    disabled={isBusy}
                                    id="category"
                                    name="category"
                                    onChange={(event) =>
                                        updateField(
                                            "category",
                                            event.currentTarget.value as
                                                | ServiceCategory
                                                | "",
                                        )
                                    }
                                    value={values.category}
                                >
                                    <option value="">Choose a category</option>
                                    {serviceCategories.map((category) => (
                                        <option key={category} value={category}>
                                            {category}
                                        </option>
                                    ))}
                                </select>
                                <FieldError
                                    id="category-error"
                                    message={errors.category}
                                />
                            </div>

                            <div>
                                <label
                                    className="mb-2 block text-sm font-medium text-foreground"
                                    htmlFor="price"
                                >
                                    Price{" "}
                                    <span
                                        aria-hidden="true"
                                        className="text-primary"
                                    >
                                        *
                                    </span>
                                </label>
                                <Input
                                    className={fieldClassName}
                                    disabled={isBusy}
                                    id="price"
                                    inputMode="decimal"
                                    min="0.01"
                                    name="price"
                                    onChange={(event) =>
                                        updateField(
                                            "price",
                                            event.currentTarget.value,
                                        )
                                    }
                                    placeholder="e.g. 45000"
                                    step="any"
                                    type="number"
                                    value={values.price}
                                    aria-invalid={Boolean(errors.price)}
                                    aria-describedby={
                                        errors.price
                                            ? "price-error"
                                            : "price-help"
                                    }
                                />
                                <p
                                    className="mt-2 text-xs text-muted"
                                    id="price-help"
                                >
                                    Enter a positive amount in your service
                                    currency.
                                </p>
                                <FieldError
                                    id="price-error"
                                    message={errors.price}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label
                                    className="mb-2 block text-sm font-medium text-foreground"
                                    htmlFor="description"
                                >
                                    Description{" "}
                                    <span
                                        aria-hidden="true"
                                        className="text-primary"
                                    >
                                        *
                                    </span>
                                </label>
                                <TextArea
                                    aria-describedby={
                                        errors.description
                                            ? "description-error"
                                            : "description-help"
                                    }
                                    aria-invalid={Boolean(errors.description)}
                                    className={`${fieldClassName} min-h-36 resize-y`}
                                    disabled={isBusy}
                                    id="description"
                                    maxLength={3000}
                                    name="description"
                                    onChange={(event) =>
                                        updateField(
                                            "description",
                                            event.currentTarget.value,
                                        )
                                    }
                                    placeholder="Describe your service, what is included, and how you work with couples."
                                    value={values.description}
                                />
                                <p
                                    className="mt-2 text-xs text-muted"
                                    id="description-help"
                                >
                                    Use at least 20 characters so couples can
                                    understand your offering.
                                </p>
                                <FieldError
                                    id="description-error"
                                    message={errors.description}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label
                                    className="mb-2 block text-sm font-medium text-foreground"
                                    htmlFor="location"
                                >
                                    Location{" "}
                                    <span
                                        aria-hidden="true"
                                        className="text-primary"
                                    >
                                        *
                                    </span>
                                </label>
                                <Input
                                    autoComplete="address-level2"
                                    className={fieldClassName}
                                    disabled={isBusy}
                                    id="location"
                                    maxLength={200}
                                    name="location"
                                    onChange={(event) =>
                                        updateField(
                                            "location",
                                            event.currentTarget.value,
                                        )
                                    }
                                    placeholder="City or area where you provide your service"
                                    value={values.location}
                                    aria-invalid={Boolean(errors.location)}
                                    aria-describedby={
                                        errors.location
                                            ? "location-error"
                                            : undefined
                                    }
                                />
                                <FieldError
                                    id="location-error"
                                    message={errors.location}
                                />
                            </div>
                        </div>

                        <section
                            aria-labelledby="images-heading"
                            className="mt-9 border-t border-border pt-7"
                        >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <h2
                                        className="font-heading text-3xl text-foreground"
                                        id="images-heading"
                                    >
                                        Service images{" "}
                                        <span
                                            aria-hidden="true"
                                            className="font-sans text-sm text-primary"
                                        >
                                            *
                                        </span>
                                    </h2>
                                    <p
                                        className="mt-2 text-sm leading-6 text-muted"
                                        id="images-help"
                                    >
                                        Add up to 10 JPG, PNG, or WebP images.
                                        Each file can be up to 10 MB.
                                    </p>
                                </div>
                                <p className="text-sm font-medium text-muted">
                                    {uploadedCount} of {images.length} uploaded
                                </p>
                            </div>

                            <label
                                className={`mt-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-secondary bg-background/70 px-5 py-7 text-center transition hover:bg-surface-secondary focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus ${isBusy || images.length >= MAX_SERVICE_IMAGES ? "cursor-not-allowed opacity-60" : ""}`}
                                htmlFor="serviceImages"
                            >
                                <span
                                    aria-hidden="true"
                                    className="mb-3 grid size-11 place-items-center rounded-full bg-secondary/35 text-primary"
                                >
                                    <svg
                                        className="size-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5"
                                            stroke="currentColor"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="1.7"
                                        />
                                    </svg>
                                </span>
                                <span className="text-sm font-semibold text-foreground">
                                    Choose service images
                                </span>
                                <span className="mt-1 text-xs text-muted">
                                    Select multiple files; WedPlan uploads each
                                    separately.
                                </span>
                                <input
                                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                    className="sr-only"
                                    disabled={
                                        isBusy ||
                                        images.length >= MAX_SERVICE_IMAGES
                                    }
                                    id="serviceImages"
                                    multiple
                                    name="image"
                                    onChange={handleFilesSelected}
                                    type="file"
                                    aria-describedby={`images-help${errors.images ? " images-error" : ""}`}
                                />
                            </label>
                            <FieldError
                                id="images-error"
                                message={errors.images}
                            />

                            {images.length > 0 && (
                                <div className="mt-5 space-y-4">
                                    {isUploading && (
                                        <div
                                            aria-live="polite"
                                            className="rounded-xl bg-surface-secondary p-4"
                                        >
                                            <div className="mb-2 flex justify-between gap-4 text-sm">
                                                <span className="font-medium text-foreground">
                                                    Uploading{" "}
                                                    {activeUploadId
                                                        ? "an image"
                                                        : "images"}
                                                    …
                                                </span>
                                                <span className="text-muted">
                                                    {uploadedCount} /{" "}
                                                    {images.length}
                                                </span>
                                            </div>
                                            <progress
                                                aria-label="Image upload progress"
                                                className="h-2 w-full accent-primary"
                                                max={100}
                                                value={progressValue}
                                            />
                                        </div>
                                    )}

                                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        {images.map((image) => (
                                            <li
                                                className="overflow-hidden rounded-2xl border border-border bg-background"
                                                key={image.id}
                                            >
                                                <div className="relative aspect-4/3 bg-surface-secondary">
                                                    <Image
                                                        alt="Preview of selected service image"
                                                        className="object-cover"
                                                        fill
                                                        src={image.previewUrl}
                                                        unoptimized
                                                    />
                                                    <button
                                                        aria-label={`Remove ${image.file.name}`}
                                                        className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-surface/95 text-foreground shadow-soft transition hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
                                                        disabled={
                                                            isBusy ||
                                                            image.state ===
                                                                "uploading"
                                                        }
                                                        onClick={() =>
                                                            removeImage(
                                                                image.id,
                                                            )
                                                        }
                                                        type="button"
                                                    >
                                                        <svg
                                                            aria-hidden="true"
                                                            className="size-4"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                d="m6 6 12 12M18 6 6 18"
                                                                stroke="currentColor"
                                                                strokeLinecap="round"
                                                                strokeWidth="1.8"
                                                            />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="p-3">
                                                    <p
                                                        className="truncate text-sm font-medium text-foreground"
                                                        title={image.file.name}
                                                    >
                                                        {image.file.name}
                                                    </p>
                                                    <p
                                                        aria-live="polite"
                                                        className={`mt-1 text-xs ${image.state === "failed" ? "text-red-700" : "text-muted"}`}
                                                    >
                                                        {image.state ===
                                                            "queued" &&
                                                            "Ready to upload"}
                                                        {image.state ===
                                                            "uploading" &&
                                                            "Uploading securely…"}
                                                        {image.state ===
                                                            "uploaded" &&
                                                            "Uploaded and ready to include"}
                                                        {image.state ===
                                                            "failed" &&
                                                            (image.error ??
                                                                "Upload failed")}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>

                                    {pendingCount > 0 && (
                                        <Button
                                            className="w-full sm:w-auto"
                                            isDisabled={isBusy}
                                            onPress={() =>
                                                void uploadPendingImages()
                                            }
                                            type="button"
                                            variant="outline"
                                        >
                                            {isUploading
                                                ? "Uploading images…"
                                                : images.some(
                                                        (image) =>
                                                            image.state ===
                                                            "failed",
                                                    )
                                                  ? "Retry image uploads"
                                                  : `Upload ${pendingCount} image${pendingCount === 1 ? "" : "s"}`}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </section>

                        <div className="mt-9 border-t border-border pt-6">
                            <button
                                aria-hidden="true"
                                className="sr-only"
                                tabIndex={-1}
                                type="submit"
                            >
                                Submit service for review
                            </button>
                            <Button
                                className="w-full sm:w-auto sm:min-w-56"
                                isDisabled={isBusy || isServiceSubmitted}
                                onPress={() => formRef.current?.requestSubmit()}
                                size="lg"
                                type="button"
                                variant="primary"
                            >
                                {isSubmitting
                                    ? "Submitting service…"
                                    : "Submit service for review"}
                            </Button>
                            <p className="mt-3 text-xs leading-5 text-muted">
                                WedPlan assigns your vendor account and review
                                status automatically.
                            </p>
                        </div>
                    </form>

                    <aside className="space-y-4 lg:sticky lg:top-28">
                        <section className="rounded-3xl border border-border bg-surface p-6 shadow-soft">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                                Before you submit
                            </p>
                            <h2 className="mt-3 font-heading text-2xl text-foreground">
                                A clear listing helps couples understand your
                                service
                            </h2>
                            <ul className="mt-5 space-y-4 text-sm leading-6 text-muted">
                                <li className="flex gap-3">
                                    <span
                                        aria-hidden="true"
                                        className="mt-2 size-1.5 shrink-0 rounded-full bg-secondary"
                                    />
                                    Include what is covered and where you work.
                                </li>
                                <li className="flex gap-3">
                                    <span
                                        aria-hidden="true"
                                        className="mt-2 size-1.5 shrink-0 rounded-full bg-secondary"
                                    />
                                    Upload clear images that represent your
                                    work.
                                </li>
                                <li className="flex gap-3">
                                    <span
                                        aria-hidden="true"
                                        className="mt-2 size-1.5 shrink-0 rounded-full bg-secondary"
                                    />
                                    New service listings are submitted as
                                    Pending for review.
                                </li>
                            </ul>
                        </section>
                        <section className="rounded-3xl border border-secondary/60 bg-secondary/20 p-6">
                            <p className="text-sm font-semibold text-foreground">
                                Need to pause?
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted">
                                You can leave this page without saving. Your
                                service is only created after you submit the
                                completed form.
                            </p>
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    );
}
