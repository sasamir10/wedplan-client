import { z } from "zod";

export const serviceCategories = [
    "Photography & Videography",
    "Wedding Venues",
    "Decoration & Florist",
    "Catering Services",
    "Makeup & Styling",
    "Wedding Fashion",
] as const;

export const hostedServiceImageUrlSchema = z
    .url({ protocol: /^https$/ })
    .refine((value) => {
        const url = new URL(value);
        return (
            url.hostname === "i.ibb.co" &&
            !url.username &&
            !url.password &&
            !url.search &&
            !url.hash
        );
    }, "Upload an image through WedPlan before submitting.");

export const vendorServiceSchema = z.object({
    serviceName: z
        .string()
        .trim()
        .min(1, "Service name is required")
        .max(120, "Service name must be 120 characters or fewer"),
    category: z.enum(serviceCategories, {
        error: "Select a service category",
    }),
    description: z
        .string()
        .trim()
        .min(20, "Description must be at least 20 characters")
        .max(3000, "Description must be 3,000 characters or fewer"),
    price: z
        .string()
        .trim()
        .min(1, "Price is required")
        .refine(
            (value) => Number.isFinite(Number(value)) && Number(value) > 0,
            "Enter a price greater than zero",
        )
        .transform(Number),
    location: z
        .string()
        .trim()
        .min(1, "Location is required")
        .max(200, "Location must be 200 characters or fewer"),
    images: z
        .array(hostedServiceImageUrlSchema)
        .min(1, "Upload at least one service image")
        .max(10, "Upload no more than 10 service images"),
});

export const uploadedServiceImageResponseSchema = z.object({
    success: z.literal(true),
    image: z.object({
        url: hostedServiceImageUrlSchema,
    }),
});

export type ServiceCategory = (typeof serviceCategories)[number];
export type VendorServicePayload = z.infer<typeof vendorServiceSchema>;
