"use client";

import { Button, Input, ToastProvider, toast, TextArea } from "@heroui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { authenticatedApiRequest } from "@/lib/authenticated-api";
import {
    serviceCategories,
    uploadedServiceImageResponseSchema,
    vendorServiceResponseEnvelopeSchema,
    vendorServicesResponseSchema,
    vendorServiceSchema,
    type ServiceCategory,
    type VendorService,
} from "@/lib/validations/service";

const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 10 * 1024 * 1024;
const maxImages = 10;
const inputClassName =
    "w-full rounded-xl border border-field-border bg-field-background px-4 py-3 text-sm text-field-foreground shadow-field outline-none transition placeholder:text-field-placeholder focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-65";

type Values = {
    serviceName: string;
    category: ServiceCategory | "";
    description: string;
    price: string;
    location: string;
};

type NewImage = {
    id: string;
    file: File;
    preview: string;
    hostedUrl?: string;
    state: "queued" | "uploading" | "uploaded" | "failed";
    error?: string;
};

type FormField = keyof Values | "images";
type FieldErrors = Partial<Record<FormField, string>>;

const emptyValues: Values = {
    serviceName: "",
    category: "",
    description: "",
    price: "",
    location: "",
};

function messageForStatus(status: number) {
    if (status === 401) return "Your session has expired. Please sign in again.";
    if (status === 403) return "This action is available to vendor accounts.";
    if (status === 404) return "This service could not be found. Return to My Services and refresh the list.";
    if (status === 409) return "Your plan has reached its active service limit.";
    if (status === 413) return "Each image must be 10 MB or smaller.";
    if (status === 415) return "Choose a JPG, PNG, or WebP image.";
    if (status === 503) return "Image uploads are temporarily unavailable.";
    if (status === 502 || status === 504) return "The image service could not complete the upload. Please try again.";
    if (status === 400) return "The request could not be validated. Review the fields and try again.";
    return "We couldn't save your changes. Please try again.";
}

function FieldError({ message }: { message?: string }) {
    return message ? <p className="mt-2 text-sm text-red-700" role="alert">{message}</p> : null;
}

function EditServiceFormContent({ serviceId }: { serviceId: string }) {
    const router = useRouter();
    const { data: sessionData, isPending: isSessionPending, error: sessionError } = authClient.useSession();
    const [service, setService] = useState<VendorService | null>(null);
    const [values, setValues] = useState<Values>(emptyValues);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [newImages, setNewImages] = useState<NewImage[]>([]);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const imageUrls = useRef(new Set<string>());
    const uploadLock = useRef(false);
    const saveLock = useRef(false);
    const redirectTimer = useRef<number | null>(null);
    const isVendor = sessionData?.user?.role === "vendor";

    const loadService = useCallback(async (signal: AbortSignal) => {
        try {
            const response = await authenticatedApiRequest("/api/vendor/services", { signal });
            if (!response.ok) throw new Error("Could not load service");

            const payload: unknown = await response.json();
            const result = vendorServicesResponseSchema.safeParse(payload);
            if (!result.success) throw new Error("Invalid service list");

            const match = result.data.services.find((item) => item.id === serviceId);
            if (!match) {
                setService(null);
                setLoadError("This service could not be found in your vendor account.");
                return;
            }

            setService(match);
            setValues({
                serviceName: match.serviceName,
                category: match.category,
                description: match.description,
                price: String(match.price),
                location: match.location,
            });
            setExistingImages(match.images);
        } catch {
            if (!signal.aborted) setLoadError("We couldn't load this service. Check your connection and try again.");
        } finally {
            if (!signal.aborted) setIsLoading(false);
        }
    }, [serviceId]);

    useEffect(() => {
        if (isSessionPending || sessionError || !sessionData?.user || !isVendor) {
            return;
        }
        const controller = new AbortController();
        const startRequest = window.setTimeout(() => {
            if (!controller.signal.aborted) void loadService(controller.signal);
        }, 0);
        return () => {
            window.clearTimeout(startRequest);
            controller.abort();
        };
    }, [isSessionPending, sessionData?.user, sessionError, isVendor, retryCount, loadService]);

    useEffect(() => () => {
        for (const url of imageUrls.current) URL.revokeObjectURL(url);
        if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current);
    }, []);

    function setField<K extends keyof Values>(field: K, value: Values[K]) {
        setValues((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    }

    function addFiles(event: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.currentTarget.files ?? []);
        event.currentTarget.value = "";
        const available = maxImages - existingImages.length - newImages.length;
        const additions: NewImage[] = [];
        const failures: string[] = [];

        for (const file of files) {
            if (additions.length >= available) {
                failures.push(`You can include up to ${maxImages} images.`);
                break;
            }
            if (!supportedImageTypes.has(file.type)) {
                failures.push(`${file.name}: choose a JPG, PNG, or WebP file.`);
                continue;
            }
            if (file.size > maxImageBytes) {
                failures.push(`${file.name}: each image must be 10 MB or smaller.`);
                continue;
            }
            const preview = URL.createObjectURL(file);
            imageUrls.current.add(preview);
            additions.push({ id: globalThis.crypto.randomUUID(), file, preview, state: "queued" });
        }

        if (additions.length) {
            setNewImages((current) => [...current, ...additions]);
            setErrors((current) => ({ ...current, images: undefined }));
        }
        if (failures.length) toast.danger(failures.join(" "));
    }

    function removeNewImage(id: string) {
        const image = newImages.find((item) => item.id === id);
        if (!image || image.state === "uploading") return;
        URL.revokeObjectURL(image.preview);
        imageUrls.current.delete(image.preview);
        setNewImages((current) => current.filter((item) => item.id !== id));
    }

    async function uploadAdditionalImages() {
        if (uploadLock.current || isSaving) return;
        const queued = newImages.filter((image) => image.state === "queued" || image.state === "failed");
        if (!queued.length) return;

        uploadLock.current = true;
        setIsUploading(true);
        let failures = 0;
        try {
            for (const image of queued) {
                setNewImages((current) => current.map((item) => item.id === image.id ? { ...item, state: "uploading", error: undefined } : item));
                let safeError = "The image could not be uploaded. Check your connection and try again.";
                try {
                    const formData = new FormData();
                    formData.append("image", image.file);
                    const response = await authenticatedApiRequest("/api/vendor/services/upload-image", {
                        method: "POST",
                        body: formData,
                    });
                    if (!response.ok) {
                        safeError = messageForStatus(response.status);
                        throw new Error("Upload failed");
                    }
                    const payload: unknown = await response.json();
                    const result = uploadedServiceImageResponseSchema.safeParse(payload);
                    if (!result.success) {
                        safeError = "The image service returned an invalid response.";
                        throw new Error("Invalid upload response");
                    }
                    setNewImages((current) => current.map((item) => item.id === image.id ? { ...item, state: "uploaded", hostedUrl: result.data.image.url } : item));
                } catch {
                    failures += 1;
                    setNewImages((current) => current.map((item) => item.id === image.id ? { ...item, state: "failed", error: safeError } : item));
                }
            }
        } finally {
            uploadLock.current = false;
            setIsUploading(false);
        }
        if (failures) toast.danger("Some images could not be uploaded. Retry or remove them before saving.");
        else toast.success("Additional images uploaded.");
    }

    function showValidationErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
        const next: FieldErrors = {};
        for (const issue of issues) {
            const key = issue.path[0];
            if (typeof key === "string" && ["serviceName", "category", "description", "price", "location", "images"].includes(key)) {
                next[key as FormField] ??= issue.message;
            }
        }
        setErrors(next);
    }

    async function saveChanges(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (saveLock.current || uploadLock.current) return;
        if (newImages.some((image) => image.state !== "uploaded")) {
            setErrors((current) => ({ ...current, images: "Upload or remove each selected image before saving." }));
            return;
        }
        const result = vendorServiceSchema.safeParse({
            ...values,
            images: [
                ...existingImages,
                ...newImages.flatMap((image) => image.hostedUrl ? [image.hostedUrl] : []),
            ],
        });
        if (!result.success) {
            showValidationErrors(result.error.issues);
            toast.danger("Please review the highlighted fields.");
            return;
        }

        saveLock.current = true;
        setIsSaving(true);
        try {
            const response = await authenticatedApiRequest(`/api/vendor/services/${encodeURIComponent(serviceId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result.data),
            });
            if (!response.ok) {
                toast.danger(messageForStatus(response.status));
                return;
            }
            const payload: unknown = await response.json();
            const saved = vendorServiceResponseEnvelopeSchema.safeParse(payload);
            if (!saved.success) {
                toast.danger("The server returned an invalid service update.");
                return;
            }
            setService(saved.data.service);
            toast.success("Service updated successfully.");
            redirectTimer.current = window.setTimeout(() => router.replace("/vendor/services"), 900);
        } catch {
            toast.danger("We couldn't reach WedPlan. Check your connection and try again.");
        } finally {
            saveLock.current = false;
            setIsSaving(false);
        }
    }

    if (isSessionPending) {
        return <div className="page-shell flex min-h-[55vh] items-center justify-center"><p className="text-sm text-muted" role="status">Checking your WedPlan session…</p></div>;
    }
    if (sessionError || !sessionData?.user || !isVendor) {
        const signedIn = Boolean(sessionData?.user);
        return (
            <div className="page-shell flex min-h-[60vh] items-center justify-center py-12">
                <section className="max-w-xl rounded-3xl border border-border bg-surface p-8 text-center shadow-soft">
                    <h1 className="font-heading text-4xl text-foreground">{signedIn ? "Vendor access required" : "Sign in to continue"}</h1>
                    <p className="mt-4 leading-7 text-muted">{signedIn ? "This page is for vendor accounts." : "Sign in with your vendor account to edit a service."}</p>
                    <Link className="mt-6 inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground" href={signedIn ? "/" : "/sign-in"}>{signedIn ? "Return home" : "Sign in"}</Link>
                </section>
            </div>
        );
    }

    if (isLoading || loadError || !service) {
        return (
            <div className="page-shell py-12 sm:py-16">
                {isLoading ? <p className="text-sm text-muted" role="status">Loading service details…</p> : (
                    <section className="rounded-3xl border border-border bg-surface p-8 text-center shadow-soft">
                        <h1 className="font-heading text-3xl text-foreground">{loadError ?? "Service not found"}</h1>
                        {loadError && <Button className="mt-5" onPress={() => {
                            setIsLoading(true);
                            setLoadError(null);
                            setRetryCount((value) => value + 1);
                        }} variant="outline">Try again</Button>}
                        <div><Link className="mt-5 inline-block text-primary underline" href="/vendor/services">Back to My Services</Link></div>
                    </section>
                )}
            </div>
        );
    }

    const busy = isUploading || isSaving;
    const uploadable = newImages.filter((image) => image.state === "queued" || image.state === "failed").length;

    return (
        <div className="page-shell py-10 sm:py-14 lg:py-16">
            <div className="mx-auto max-w-4xl">
                <header className="mb-8">
                    <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/vendor/services">← Back to My Services</Link>
                    <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Vendor workspace</p>
                    <h1 className="font-heading text-4xl text-foreground sm:text-5xl">Edit your service</h1>
                    <p className="mt-3 text-sm leading-7 text-muted">Update listing details and images. Your approval status is managed separately by WedPlan.</p>
                </header>

                <form aria-busy={busy} className="rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-8" noValidate onSubmit={saveChanges}>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="serviceName">Service name</label>
                            <Input className={inputClassName} disabled={busy} id="serviceName" maxLength={120} onChange={(event) => setField("serviceName", event.currentTarget.value)} value={values.serviceName} aria-invalid={Boolean(errors.serviceName)} aria-describedby={errors.serviceName ? "serviceName-error" : undefined} />
                            <FieldError message={errors.serviceName} />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="category">Service category</label>
                            <select className={`${inputClassName} h-12 appearance-none`} disabled={busy} id="category" onChange={(event) => setField("category", event.currentTarget.value as ServiceCategory | "")} value={values.category} aria-invalid={Boolean(errors.category)}>
                                <option value="">Choose a category</option>
                                {serviceCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                            </select>
                            <FieldError message={errors.category} />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="price">Price</label>
                            <Input className={inputClassName} disabled={busy} id="price" inputMode="decimal" min="0.01" onChange={(event) => setField("price", event.currentTarget.value)} step="any" type="number" value={values.price} aria-invalid={Boolean(errors.price)} />
                            <FieldError message={errors.price} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="description">Description</label>
                            <TextArea className={`${inputClassName} min-h-36 resize-y`} disabled={busy} id="description" maxLength={3000} onChange={(event) => setField("description", event.currentTarget.value)} value={values.description} aria-invalid={Boolean(errors.description)} />
                            <FieldError message={errors.description} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="location">Location</label>
                            <Input className={inputClassName} disabled={busy} id="location" maxLength={200} onChange={(event) => setField("location", event.currentTarget.value)} value={values.location} aria-invalid={Boolean(errors.location)} />
                            <FieldError message={errors.location} />
                        </div>
                    </div>

                    <section aria-labelledby="edit-images-heading" className="mt-8 border-t border-border pt-7">
                        <h2 className="font-heading text-3xl text-foreground" id="edit-images-heading">Service images</h2>
                        <p className="mt-2 text-sm leading-6 text-muted">Keep existing images or remove them. Additional JPG, PNG, or WebP images are uploaded securely one at a time.</p>
                        <FieldError message={errors.images} />
                        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {existingImages.map((url, index) => (
                                <article className="overflow-hidden rounded-2xl border border-border bg-background" key={`${url}-${index}`}>
                                    <div className="relative aspect-[4/3] bg-surface-secondary">
                                        <Image alt={`Existing service image ${index + 1}`} className="object-cover" fill src={url} unoptimized />
                                    </div>
                                    <Button className="m-3" isDisabled={busy} onPress={() => setExistingImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} size="sm" variant="outline">Remove image</Button>
                                </article>
                            ))}
                            {newImages.map((image) => (
                                <article className="overflow-hidden rounded-2xl border border-border bg-background" key={image.id}>
                                    <div className="relative aspect-[4/3] bg-surface-secondary">
                                        <Image alt={`Preview of ${image.file.name}`} className="object-cover" fill src={image.preview} unoptimized />
                                    </div>
                                    <div className="p-3">
                                        <p className="truncate text-sm font-medium text-foreground">{image.file.name}</p>
                                        <p aria-live="polite" className="mt-1 text-xs text-muted">
                                            {image.state === "queued" && "Ready to upload"}
                                            {image.state === "uploading" && "Uploading…"}
                                            {image.state === "uploaded" && "Uploaded"}
                                            {image.state === "failed" && image.error}
                                        </p>
                                        <Button className="mt-3" isDisabled={busy || image.state === "uploading"} onPress={() => removeNewImage(image.id)} size="sm" variant="outline">Remove image</Button>
                                    </div>
                                </article>
                            ))}
                        </div>
                        {existingImages.length + newImages.length < maxImages && (
                            <label className="mt-5 inline-flex min-h-12 cursor-pointer items-center rounded-full border border-border px-5 text-sm font-semibold text-foreground transition hover:bg-surface-secondary focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
                                Add images
                                <input accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} multiple onChange={addFiles} type="file" />
                            </label>
                        )}
                        {uploadable > 0 && (
                            <Button className="ml-0 mt-4 sm:ml-3" isDisabled={busy} onPress={() => void uploadAdditionalImages()} variant="outline">
                                {isUploading ? "Uploading images…" : `Upload ${uploadable} additional image${uploadable === 1 ? "" : "s"}`}
                            </Button>
                        )}
                    </section>

                    <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
                        <Button isDisabled={busy} isPending={isSaving} size="lg" type="submit" variant="primary">{isSaving ? "Saving changes…" : "Save changes"}</Button>
                        <Button isDisabled={busy} onPress={() => router.push("/vendor/services")} variant="outline">Cancel</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export function EditServiceForm({ serviceId }: { serviceId: string }) {
    return (
        <ToastProvider placement="top end">
            <EditServiceFormContent serviceId={serviceId} />
        </ToastProvider>
    );
}
