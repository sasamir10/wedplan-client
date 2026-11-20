import { z } from "zod";

export const registrationSchema = z
    .object({
        name: z.string().trim().min(1, "Full name is required"),

        email: z
            .string()
            .trim()
            .min(1, "Email address is required")
            .email("Please enter a valid email address"),

        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .max(128, "Password must be 128 characters or fewer")
            .regex(/[A-Z]/, "Password must contain an uppercase letter")
            .regex(/[a-z]/, "Password must contain a lowercase letter"),

        confirmPassword: z.string().min(1, "Please confirm your password"),

        role: z.enum(["customer", "vendor"]),

        businessName: z
            .string()
            .trim()
            .max(100, "Business name must be 100 characters or fewer")
            .optional(),
    })
    .superRefine((data, context) => {
        if (data.password !== data.confirmPassword) {
            context.addIssue({
                code: "custom",
                message: "Passwords do not match",
                path: ["confirmPassword"],
            });
        }

        if (data.role === "vendor" && !data.businessName) {
            context.addIssue({
                code: "custom",
                message: "Business name is required for vendors",
                path: ["businessName"],
            });
        }
    });

export type RegistrationInput = z.infer<typeof registrationSchema>;
export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .min(1, "Email address is required")
        .email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required"),
    rememberMe: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;

