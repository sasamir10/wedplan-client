import { z } from "zod";

export const bookingFormSchema = z.strictObject({
    serviceId: z
        .string()
        .regex(
            /^[a-f\d]{24}$/i,
            "Invalid service identifier.",
        ),
    eventDate: z
        .string()
        .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            "Event date must be in YYYY-MM-DD format.",
        )
        .refine(
            (value) => {
                const date = new Date(`${value}T00:00:00Z`);
                return (
                    !isNaN(date.getTime()) &&
                    date.toISOString().startsWith(value)
                );
            },
            "Please enter a valid calendar date.",
        ),
    eventLocation: z.string().trim().min(1, "Event location is required."),
    message: z.string().trim().optional(),
});

export type BookingFormPayload = z.infer<typeof bookingFormSchema>;
