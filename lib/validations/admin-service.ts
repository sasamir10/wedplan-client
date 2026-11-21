import { z } from "zod";
import { serviceCategories } from "./service";

export const adminServiceStatuses = ["Pending", "Approved", "Rejected"] as const;

export const adminServiceSchema = z.object({
    id: z.string().min(1),
    vendorId: z.string().min(1),
    vendor: z
        .object({
            id: z.string().min(1),
            name: z.string().nullable(),
            businessName: z.string().nullable(),
        })
        .nullable(),
    serviceName: z.string(),
    category: z.enum(serviceCategories),
    description: z.string(),
    price: z.number().finite().positive(),
    location: z.string(),
    images: z.array(z.url({ protocol: /^https?$/ })),
    status: z.enum(adminServiceStatuses),
    availability: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const adminServicesResponseSchema = z.object({
    success: z.literal(true),
    services: z.array(adminServiceSchema),
    pagination: z.object({
        page: z.number().int().min(1),
        limit: z.number().int().min(1),
        total: z.number().int().min(0),
        totalPages: z.number().int().min(0),
    }),
});

export const adminServiceResponseSchema = z.object({
    success: z.literal(true),
    service: adminServiceSchema,
});

export type AdminService = z.infer<typeof adminServiceSchema>;
export type AdminServiceStatus = (typeof adminServiceStatuses)[number];
export type AdminServicesPagination = z.infer<
    typeof adminServicesResponseSchema
>["pagination"];
