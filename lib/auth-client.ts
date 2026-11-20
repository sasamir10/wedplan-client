"use client";

import { inferAdditionalFields, jwtClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    fetchOptions: {
        credentials: "include",
    },
    plugins: [
        inferAdditionalFields({
            user: {
                role: {
                    type: ["customer", "vendor", "admin"],
                    input: false,
                },
                isBlocked: {
                    type: "boolean",
                    input: false,
                },
                businessName: {
                    type: "string",
                    input: false,
                },
                subscriptionPlan: {
                    type: ["free", "premium"],
                    input: false,
                },
                subscriptionExpiresAt: {
                    type: "date",
                    input: false,
                },
                signupRole: {
                    type: ["customer", "vendor"],
                    required: false,
                },
                signupBusinessName: {
                    type: "string",
                    required: false,
                },
            },
        }),
        jwtClient(),
    ],
});
