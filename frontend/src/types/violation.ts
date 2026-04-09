export enum ViolationType {
    overload = "overload",
    overspeed = "overspeed",
}

export enum ViolationStatus {
    detected = "detected",
    verified = "verified",
    dismissed = "dismissed",
}

export interface Violation {
    id: string;
    type: ViolationType;
    status: ViolationStatus;
    unitId: string;
    operator: string;
    route: string;
    location: string;
    lat: number;
    lng: number;
    timestamp: Date;
    details: {
        passengers?: number;
        capacity?: number;
        speed?: number;
        limit?: number;
    };
}

export const SAMPLE_VIOLATIONS: Violation[] = [
    {
        id: "V001",
        type: ViolationType.overload,
        status: ViolationStatus.detected,
        unitId: "PUJ-1234",
        operator: "Metro Transport",
        route: "Route A - North Terminal",
        location: "Mandaue City Hall",
        lat: 10.3285,
        lng: 123.9422,
        timestamp: new Date(),
        details: { passengers: 25, capacity: 20 },
    },
    {
        id: "V002",
        type: ViolationType.overspeed,
        status: ViolationStatus.detected,
        unitId: "BUS-5678",
        operator: "Cebu Bus Lines",
        route: "Route B - South Express",
        location: "Cebu North Bus Terminal",
        lat: 10.3385,
        lng: 123.9022,
        timestamp: new Date(Date.now() - 30 * 60000),
        details: { speed: 85, limit: 60 },
    },
    {
        id: "V003",
        type: ViolationType.overload,
        status: ViolationStatus.detected,
        unitId: "JEEP-7890",
        operator: "City Transit",
        route: "Route C - Downtown",
        location: "SM City Cebu",
        lat: 10.3185,
        lng: 123.9122,
        timestamp: new Date(Date.now() - 2 * 60 * 60000),
        details: { passengers: 28, capacity: 22 },
    },
];