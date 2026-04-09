export type Role = "SUPER_ADMIN" | "ADMIN" | "USER";

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    isActive: boolean;
    createdAt: string;
}

export interface Jeepney {
    id: string;
    plateNumber: string;
    ownerName: string;
    ownerContact?: string;
    ownerAddress?: string;
    route: string;
    bodyNumber?: string;
    color?: string;
    yearModel?: number;
    status: string;
    registeredAt: string;
    expiresAt?: string;
    violations?: Violation[];
}

export interface Violation {
    id: string;
    jeepneyId: string;
    jeepney?: Jeepney;
    issuedById: string;
    issuedBy?: User;
    type: string;
    description: string;
    location?: string;
    fineAmount?: number;
    status: string;
    issuedAt: string;
    resolvedAt?: string;
    notes?: string;
}