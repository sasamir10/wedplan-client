"use client";

import {
    AlertDialog,
    Button,
    Input,
    ToastProvider,
    toast,
} from "@heroui/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { authenticatedApiRequest } from "@/lib/authenticated-api";
import { DashboardLayout } from "@/app/components/dashboard/DashboardLayout";

interface SafeUser {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
    isBlocked: boolean;
    businessName: string | null;
    subscriptionPlan: string;
    createdAt: Date;
}

interface UserListResponse {
    success: boolean;
    users: SafeUser[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

const CARD_CLASSNAME =
    "overflow-hidden rounded-3xl border border-border bg-surface shadow-soft p-8 sm:p-12";

const TABLE_CLASSNAME =
    "w-full text-sm text-left border-collapse";

const TABLE_HEADER_CLASSNAME =
    "text-xs font-semibold uppercase tracking-[0.15em] text-primary bg-surface-secondary";

const TABLE_CELL_CLASSNAME =
    "px-4 py-4 border-b border-border text-foreground";

const TABLE_ROW_CLASSNAME =
    "hover:bg-surface-secondary transition-colors";

const BADGE_ACTIVE =
    "inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800";

const BADGE_BLOCKED =
    "inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800";

const ROLES = [
    { value: "", label: "All" },
    { value: "admin", label: "Admin" },
    { value: "customer", label: "Customer" },
    { value: "vendor", label: "Vendor" },
];

const emptyPagination = {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
};

function formatDate(value: string | Date) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : new Intl.DateTimeFormat(undefined, {
              dateStyle: "medium",
          }).format(date);
}

function roleBadge(role: string): string {
    const base =
        "rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors";
    if (role === "admin") return `${base} border-burgundy/20 bg-burgundy/10 text-burgundy`;
    if (role === "vendor") return `${base} border-gold/20 bg-gold/10 text-gold`;
    return `${base} border-secondary/70 bg-secondary/25 text-foreground`;
}

export default function AdminUsersPage() {
    const router = useRouter();
    const {
        data: sessionData,
        isPending: isSessionPending,
        error: sessionError,
    } = authClient.useSession();
    const [users, setUsers] = useState<SafeUser[]>([]);
    const [pagination, setPagination] = useState(emptyPagination);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submittingUserId, setSubmittingUserId] = useState<string | null>(
        null,
    );
    const [dialogUser, setDialogUser] = useState<SafeUser | null>(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<"block" | "unblock">(
        "block",
    );
    const searchInputRef = useRef<HTMLInputElement>(null);

    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);

        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (roleFilter) params.set("role", roleFilter);
            params.set("page", String(pagination.page));
            params.set("limit", String(pagination.limit));

            const response = await authenticatedApiRequest(
                `/api/admin/users?${params.toString()}`,
                { method: "GET" },
            );

            if (!response.ok) {
                if (response.status === 401) {
                    router.replace("/sign-in");
                    return;
                }
                throw new Error("Unable to load users.");
            }

            const payload: unknown = await response.json();
            const result: UserListResponse = payload as UserListResponse;
            setUsers(result.users);
            setPagination(result.pagination);
        } catch {
            setLoadError(
                "We couldn't load users. Check your connection and try again.",
            );
        } finally {
            setIsLoading(false);
        }
    }, [search, roleFilter, pagination.page, pagination.limit, router]);

    useEffect(() => {
        if (isSessionPending || sessionError || !sessionData?.user) {
            return;
        }

        const startRequest = window.setTimeout(() => {
            void loadUsers();
        }, 0);
        return () => {
            window.clearTimeout(startRequest);
        };
    }, [isSessionPending, sessionData?.user, sessionError, loadUsers]);

    function retry() {
        void loadUsers();
    }

    function onSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
        setSearch(event.target.value);
        setPagination({ ...pagination, page: 1 });
    }

    function onRoleChange(value: string) {
        setRoleFilter(value);
        setPagination({ ...pagination, page: 1 });
    }

    function goToPage(delta: number) {
        const nextPage = pagination.page + delta;
        if (nextPage < 1 || nextPage > pagination.totalPages) return;
        setPagination({ ...pagination, page: nextPage });
    }

    function openViewDetails(user: SafeUser) {
        setDialogUser(user);
    }

    function openConfirmDialog(user: SafeUser, action: "block" | "unblock") {
        setDialogUser(user);
        setConfirmAction(action);
        setConfirmDialogOpen(true);
    }

    async function handleConfirm() {
        if (!dialogUser) return;
        setSubmittingUserId(dialogUser.id);

        try {
            const response = await authenticatedApiRequest(
                `/api/admin/users/${dialogUser.id}/${confirmAction}`,
                { method: "PATCH" },
            );

            if (!response.ok) {
                if (response.status === 401) {
                    router.replace("/sign-in");
                    return;
                }
                throw new Error(
                    `Unable to ${confirmAction} user.`,
                );
            }

            const payload: unknown = await response.json();
            const result: {
                success: boolean;
                user: { id: string; isBlocked: boolean };
            } = payload as { success: boolean; user: { id: string; isBlocked: boolean } };

            setUsers((current) =>
                current.map((u) =>
                    u.id === result.user.id
                        ? { ...u, isBlocked: result.user.isBlocked }
                        : u,
                ),
            );

            toast(
                `${confirmAction.charAt(0).toUpperCase() + confirmAction.slice(1)}ed successfully.`,
            );
        } catch {
            toast("Unable to update user status. Please try again.", {
                variant: "danger",
            });
        } finally {
            setSubmittingUserId(null);
            setConfirmDialogOpen(false);
            setDialogUser(null);
        }
    }

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
        <DashboardLayout role="admin">
            <section className={CARD_CLASSNAME}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                    User management
                </p>
                <h1 className="font-heading text-4xl font-medium leading-tight text-foreground sm:text-5xl">
                    Manage Users
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
                    Search, filter, and manage platform user accounts.
                </p>
            </section>

            {isLoading ? (
                <section className="space-y-5" role="status" aria-busy="true">
                    <div className={`${CARD_CLASSNAME} h-32 flex items-center px-8 py-6`}>
                        <div className="h-52 animate-pulse rounded-3xl bg-surface-secondary" />
                        <div className="ml-6 space-y-2">
                            <div className="h-4 animate-pulse rounded-full bg-surface-secondary" />
                            <div className="h-4 animate-pulse rounded-full bg-surface-secondary w-3/4" />
                        </div>
                    </div>
                </section>
            ) : loadError ? (
                <section className={CARD_CLASSNAME} text-center>
                    <h2 className="font-heading text-3xl text-foreground">
                        Users couldn’t load
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-muted">
                        {loadError}
                    </p>
                    <Button className="mt-6" onPress={retry} variant="primary">
                        Try again
                    </Button>
                </section>
            ) : (
                <>
                    <section className={CARD_CLASSNAME}>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative w-full sm:w-72">
                                <Input
                                    ref={searchInputRef}
                                    placeholder="Search by name or email…"
                                    value={search}
                                    onChange={onSearchChange}
                                    className="w-full"
                                />
                            </div>
                            <select
                                value={roleFilter}
                                onChange={(e) => onRoleChange(e.target.value)}
                                disabled={isLoading}
                                className="flex w-full items-center rounded-xl border border-input bg-background px-4 py-3 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {ROLES.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </section>

                    {users.length === 0 ? (
                        <section className={CARD_CLASSNAME} text-center py-16>
                            <p className="text-sm text-muted">
                                No users found matching your filters.
                            </p>
                            <Button
                                onPress={() => {
                                    setSearch("");
                                    setRoleFilter("");
                                    setPagination({ ...pagination, page: 1 });
                                }}
                                variant="outline"
                            >
                                Clear filters
                            </Button>
                        </section>
                    ) : (
                        <>
                            <section className={CARD_CLASSNAME} overflow-x-auto>
                                <table className={TABLE_CLASSNAME}>
                                    <thead>
                                        <tr className={TABLE_HEADER_CLASSNAME}>
                                            <th className={TABLE_CELL_CLASSNAME}>
                                                User
                                            </th>
                                            <th className={TABLE_CELL_CLASSNAME}>
                                                Email
                                            </th>
                                            <th className={TABLE_CELL_CLASSNAME}>
                                                Role
                                            </th>
                                            <th className={TABLE_CELL_CLASSNAME}>
                                                Status
                                            </th>
                                            <th className={TABLE_CELL_CLASSNAME}>
                                                Registered
                                            </th>
                                            <th className={TABLE_CELL_CLASSNAME}>
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr
                                                key={user.id}
                                                className={TABLE_ROW_CLASSNAME}
                                            >
                                                <td className={TABLE_CELL_CLASSNAME}>
                                                    <div className="flex items-center gap-3">
                                                        {user.image ? (
                                                            <Image
                                                                src={user.image}
                                                                alt={user.name ?? "User"}
                                                                width={32}
                                                                height={32}
                                                                className="rounded-full"
                                                            />
                                                        ) : (
                                                            <div className="size-8 rounded-full bg-surface-secondary flex items-center justify-center">
                                                                <span className="text-sm">👤</span>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-medium text-foreground">
                                                                {user.name ?? "Unnamed user"}
                                                            </p>
                                                            {user.businessName && (
                                                                <p className="text-xs text-muted">
                                                                    {user.businessName}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={TABLE_CELL_CLASSNAME}>
                                                    <p className="text-sm text-foreground">{user.email}</p>
                                                </td>
                                                <td className={TABLE_CELL_CLASSNAME}>
                                                    <span className={roleBadge(user.role)}>
                                                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                                    </span>
                                                </td>
                                                <td className={TABLE_CELL_CLASSNAME}>
                                                    {user.isBlocked ? (
                                                        <span className={BADGE_BLOCKED}>
                                                            Blocked
                                                        </span>
                                                    ) : (
                                                        <span className={BADGE_ACTIVE}>
                                                            Active
                                                        </span>
                                                    )}
                                                </td>
                                                <td className={TABLE_CELL_CLASSNAME}>
                                                    <p className="text-sm text-foreground">
                                                        {formatDate(user.createdAt)}
                                                    </p>
                                                </td>
                                                <td className={TABLE_CELL_CLASSNAME}>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onPress={() => openViewDetails(user)}
                                                        >
                                                            View
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            isDisabled={submittingUserId === user.id}
                                                            onPress={() =>
                                                                openConfirmDialog(
                                                                    user,
                                                                    user.isBlocked
                                                                        ? "unblock"
                                                                        : "block",
                                                                )
                                                            }
                                                        >
                                                            {user.isBlocked
                                                                ? "Unblock"
                                                                : "Block"}
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </section>

                            <section className="flex items-center justify-between gap-4 pt-4 sm:flex-row sm:justify-between">
                                <p className="text-sm text-muted">
                                    Showing page{" "}
                                    <span className="font-medium">{pagination.page}</span>{" "}
                                    of{" "}
                                    <span className="font-medium">{pagination.totalPages}</span>{" "}
                                    ({pagination.total} total users)
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        isDisabled={
                                            pagination.page <= 1 || isLoading
                                        }
                                        onPress={() => goToPage(-1)}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        isDisabled={
                                            pagination.page >= pagination.totalPages ||
                                            isLoading
                                        }
                                        onPress={() => goToPage(1)}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </section>
                        </>
                    )}
                </>
            )}

            <AlertDialog
                isOpen={dialogUser !== null && !confirmDialogOpen}
                onOpenChange={(open) => {
                    if (!open) setDialogUser(null);
                }}
            >
                <AlertDialog.Backdrop className="bg-charcoal/45 backdrop-blur-sm" isDismissable>
                    <AlertDialog.Container>
                        <AlertDialog.Dialog className="rounded-2xl border border-border bg-surface p-6 shadow-card">
                            <AlertDialog.Header>
                                <AlertDialog.Heading className="font-heading text-3xl text-foreground">
                                    User Details
                                </AlertDialog.Heading>
                            </AlertDialog.Header>
                            <AlertDialog.Body className="mt-3 space-y-4">
                                {dialogUser && (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                                                Name
                                            </p>
                                            <p className="text-sm text-foreground">
                                                {dialogUser.name ?? "Unnamed user"}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                                                Email
                                            </p>
                                            <p className="text-sm text-foreground">
                                                {dialogUser.email}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                                                Role
                                            </p>
                                            <span className={roleBadge(dialogUser.role)}>
                                                {dialogUser.role.charAt(0).toUpperCase() + dialogUser.role.slice(1)}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                                                Status
                                            </p>
                                            {dialogUser.isBlocked ? (
                                                <span className={BADGE_BLOCKED}>
                                                    Blocked
                                                </span>
                                            ) : (
                                                <span className={BADGE_ACTIVE}>
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        {dialogUser.businessName && (
                                            <div className="space-y-1">
                                                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                                                    Business Name
                                                </p>
                                                <p className="text-sm text-foreground">
                                                    {dialogUser.businessName}
                                                </p>
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                                                Subscription Plan
                                            </p>
                                            <p className="text-sm text-foreground">
                                                {dialogUser.subscriptionPlan.charAt(0).toUpperCase() + dialogUser.subscriptionPlan.slice(1)}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
                                                Registered
                                            </p>
                                            <p className="text-sm text-foreground">
                                                {formatDate(dialogUser.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </AlertDialog.Body>
                            <AlertDialog.Footer className="mt-6 flex justify-end">
                                <Button
                                    onPress={() => setDialogUser(null)}
                                    variant="outline"
                                >
                                    Close
                                </Button>
                            </AlertDialog.Footer>
                        </AlertDialog.Dialog>
                    </AlertDialog.Container>
                </AlertDialog.Backdrop>
            </AlertDialog>

            <AlertDialog
                isOpen={confirmDialogOpen}
                onOpenChange={setConfirmDialogOpen}
            >
                <AlertDialog.Backdrop className="bg-charcoal/45 backdrop-blur-sm" isDismissable>
                    <AlertDialog.Container>
                        <AlertDialog.Dialog className="rounded-2xl border border-border bg-surface p-6 shadow-card">
                            <AlertDialog.Header>
                                <AlertDialog.Heading className="font-heading text-3xl text-foreground">
                                    {confirmAction === "block"
                                        ? "Block User?"
                                        : "Unblock User?"}
                                </AlertDialog.Heading>
                            </AlertDialog.Header>
                            <AlertDialog.Body className="mt-3 text-sm leading-6 text-muted">
                                Are you sure you want to {confirmAction} &quot;{dialogUser?.name ?? "this user"}&quot;?
                                {confirmAction === "block"
                                    ? " They will lose access to the platform."
                                    : " They will regain access to the platform."}
                            </AlertDialog.Body>
                            <AlertDialog.Footer className="mt-6 flex justify-end gap-3">
                                <Button
                                    onPress={() => setConfirmDialogOpen(false)}
                                    variant="outline"
                                    isDisabled={submittingUserId !== null}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onPress={handleConfirm}
                                    variant="danger"
                                    isDisabled={submittingUserId !== null}
                                >
                                    {submittingUserId !== null
                                        ? `${confirmAction === "block" ? "Blocking…" : "Unblocking…"}`
                                        : `${confirmAction.charAt(0).toUpperCase() + confirmAction.slice(1)}`}
                                </Button>
                            </AlertDialog.Footer>
                        </AlertDialog.Dialog>
                    </AlertDialog.Container>
                </AlertDialog.Backdrop>
            </AlertDialog>

            <ToastProvider placement="top end" />
        </DashboardLayout>
    );
}
