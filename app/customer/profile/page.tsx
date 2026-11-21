"use client";

import { Button, ToastProvider, toast } from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { authenticatedApiRequest } from "@/lib/authenticated-api";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";

interface Profile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  businessName: string | null;
  subscriptionPlan: string;
}

interface ProfileResponse {
  success: boolean;
  profile: Profile;
}

const cardClassName =
  "overflow-hidden rounded-3xl border border-border bg-surface shadow-soft p-8 sm:p-12";

const inputClassName =
  "flex w-full items-center rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const labelClassName =
  "mb-2 block text-sm font-semibold text-foreground sm:mb-2.5";

const hintClassName =
  "mt-1 text-xs text-muted";

function uploadImageToImgBB(file: File): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File must be an image."));
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    fetch("/api/profile/upload-image", {
      method: "POST",
      body: formData,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          reject(new Error(errorText || "Image upload failed."));
          return;
        }
        return response.json();
      })
      .then((data) => {
        resolve({ url: data.image.url });
      })
      .catch((error) => {
        reject(error);
      });
  });
}

export default function CustomerProfilePage() {
  const router = useRouter();
  const {
    data: sessionData,
    isPending: isSessionPending,
    error: sessionError,
  } = authClient.useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await authenticatedApiRequest(
        "/api/profile",
        { method: "GET" },
      );

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/sign-in");
          return;
        }
        throw new Error("Unable to load profile.");
      }

      const payload: unknown = await response.json();
      const result: ProfileResponse = payload as ProfileResponse;
      setProfile(result.profile);
    } catch {
      setLoadError(
        "We couldn't load your profile. Check your connection and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (isSessionPending || sessionError || !sessionData?.user) {
      return;
    }

    const startRequest = window.setTimeout(() => {
      void loadProfile();
    }, 0);
    return () => {
      window.clearTimeout(startRequest);
    };
  }, [isSessionPending, sessionData?.user, sessionError, loadProfile]);

  function retry() {
    void loadProfile();
  }

  const handleSave = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    if (!profile || !nameInputRef.current) return;

    const name = nameInputRef.current.value.trim();

    if (!name) {
      toast("Name is required.", {
        description: "Please enter a valid name.",
        variant: "danger",
      });
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await authenticatedApiRequest("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ name, image: profile.image }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/sign-in");
          return;
        }
        throw new Error("Unable to save profile.");
      }

      const payload: unknown = await response.json();
      const result: ProfileResponse = payload as ProfileResponse;
      setProfile(result.profile);

      toast("Profile updated.", {
        description: "Your profile information has been saved.",
      });
    } catch {
      toast("Unable to save profile.", {
        description: "Please try again.",
        variant: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [profile, isSubmitting, router]);

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast("Image too large.", {
        description: "Please choose an image 10 MB or smaller.",
        variant: "danger",
      });
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast("Unsupported file type.", {
        description: "Please upload a JPEG, PNG, or WebP image.",
        variant: "danger",
      });
      return;
    }

    setUploadingImage(true);

    try {
      const { url } = await uploadImageToImgBB(file);

      if (!profile) return;

      const response = await authenticatedApiRequest("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: profile.name, image: url }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/sign-in");
          return;
        }
        throw new Error("Unable to update profile image.");
      }

      const payload: unknown = await response.json();
      const result: ProfileResponse = payload as ProfileResponse;
      setProfile(result.profile);

      toast("Profile image updated.");
    } catch {
      toast("Unable to upload image.", {
        description: "Please try again.",
        variant: "danger",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  if (isSessionPending) {
    return (
      <div className="page-shell flex min-h-[60vh] items-center justify-center py-16">
        <p className="text-sm text-muted" role="status">
          Checking your session…
        </p>
      </div>
    );
  }

  if (sessionError || !sessionData?.user) {
    return (
      <div className="page-shell flex min-h-[60vh] items-center justify-center py-16">
        <p className="text-sm text-muted" role="status">
          Redirecting to sign in…
        </p>
      </div>
    );
  }

  return (
    <DashboardLayout role="customer">
      <section className="rounded-3xl border border-border bg-surface p-8 shadow-soft sm:p-12">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Profile settings
        </p>
        <h1 className="font-heading text-4xl font-medium leading-tight text-foreground sm:text-5xl">
          Profile
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
          Update your personal information and profile image.
        </p>
      </section>

      {isLoading ? (
        <section className="space-y-5" role="status" aria-busy="true">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className={`${cardClassName} h-32 flex items-center px-8 py-6`}
            >
              <div className="h-52 animate-pulse rounded-3xl bg-surface-secondary" />
              <div className="ml-6 space-y-2">
                <div className="h-4 animate-pulse rounded-full bg-surface-secondary" />
                <div className="h-4 animate-pulse rounded-full bg-surface-secondary w-3/4" />
              </div>
            </div>
          ))}
        </section>
      ) : loadError ? (
        <section className={cardClassName} text-center>
          <h2 className="font-heading text-3xl text-foreground">
            Profile couldn’t load
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">{loadError}</p>
          <Button className="mt-6" onPress={retry} variant="primary">
            Try again
          </Button>
        </section>
      ) : (
        <form
          onSubmit={handleSave}
          className={cardClassName}
          onReset={() => {
            nameInputRef.current?.focus();
          }}
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            <div className="space-y-2">
              <label className={labelClassName}>Name</label>
              <input
                ref={nameInputRef}
                className={inputClassName}
                type="text"
                defaultValue={profile?.name ?? ""}
                disabled={isSubmitting}
              />
              <p className={hintClassName}>
                Your display name on WedPlan.
              </p>
            </div>

            <div className="space-y-2">
              <label className={labelClassName}>Email</label>
              <input
                className={inputClassName}
                type="email"
                defaultValue={profile?.email}
                readOnly
                disabled
              />
              <p className={hintClassName}>
                Email cannot be changed from this page.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-2">
            <label className={labelClassName}>Profile Image</label>

            <div className="relative group">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                disabled={uploadingImage || isSubmitting}
                className="sr-only"
              />
              <div className="flex items-center gap-4 rounded-xl border border-dashed border-input bg-background p-6 text-center hover:bg-surface-secondary transition-colors">
                {profile?.image ? (
                  <img
                    src={profile.image}
                    alt="Profile"
                    className="size-20 rounded-full object-cover mx-auto"
                  />
                ) : (
                  <div className="size-20 rounded-full bg-surface-secondary flex items-center justify-center mx-auto">
                    <span className="text-2xl">👤</span>
                  </div>
                )}
                {uploadingImage ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <svg
                      className="animate-spin size-4 text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Uploading…
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.querySelector(
                        'input[type="file"]',
                      ) as HTMLInputElement | null;
                      input?.click();
                    }}
                    disabled={uploadingImage || isSubmitting}
                    className="flex items-center gap-2 w-full text-sm font-medium text-primary hover:text-primary-focus transition-colors"
                  >
                    <span className="size-4">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        ></path>
                      </svg>
                    </span>
                    Change photo
                  </button>
                )}
              </div>
              <p className={hintClassName}>
                JPEG, PNG, or WebP. Max 10 MB.
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <Button
              type="submit"
              isDisabled={isSubmitting}
              className="w-full"
              variant="primary"
            >
              {isSubmitting ? "Saving…" : "Save Changes"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                nameInputRef.current?.focus();
                void loadProfile();
              }}
              isDisabled={isSubmitting}
              variant="outline"
            >
              Refresh
            </Button>
          </div>
        </form>
      )}

      <ToastProvider placement="top end" />
    </DashboardLayout>
  );
}
