export type WedPlanRole = "customer" | "vendor" | "admin";

export function isWedPlanRole(value: unknown): value is WedPlanRole {
    return value === "customer" || value === "vendor" || value === "admin";
}

export function dashboardPathForRole(role: unknown): string | null {
    switch (role) {
        case "customer":
            return "/customer";
        case "vendor":
            return "/vendor";
        case "admin":
            return "/admin";
        default:
            return null;
    }
}
