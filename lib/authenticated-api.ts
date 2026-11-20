"use client";

import { authClient } from "@/lib/auth-client";

const missingTokenMessage = "Please sign in again to continue.";
const tokenUnavailableMessage =
    "We couldn't verify your sign-in. Please try again.";

export async function authenticatedApiRequest(
    path: string,
    init: RequestInit = {},
): Promise<Response> {
    const configuredBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!configuredBaseURL) {
        throw new Error("The WedPlan API is currently unavailable.");
    }

    const baseURL = new URL(configuredBaseURL);
    const requestURL = new URL(path, baseURL);

    if (requestURL.origin !== baseURL.origin) {
        throw new Error("The request URL must use the configured WedPlan API.");
    }

    let tokenResponse;

    try {
        tokenResponse = await authClient.token();
    } catch {
        throw new Error(tokenUnavailableMessage);
    }

    if (tokenResponse.error) {
        throw new Error(tokenUnavailableMessage);
    }

    const token = tokenResponse.data?.token;

    if (!token) {
        throw new Error(missingTokenMessage);
    }

    const headers = new Headers(init.headers);
    headers.set("Authorization", "Bearer " + token);

    return fetch(requestURL, {
        ...init,
        headers,
        credentials: "include",
    });
}
