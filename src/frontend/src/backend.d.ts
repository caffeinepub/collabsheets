import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Presence {
    userName: string;
    color: string;
    lastActive: bigint;
}
export interface Cell {
    col: bigint;
    row: bigint;
    value: string;
    timestamp: bigint;
    editedBy: string;
    formula: string;
}
export interface UserProfile {
    name: string;
    color: string;
}
export interface Document {
    id: string;
    title: string;
    authorName: string;
    author: Principal;
    lastModified: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createDocument(title: string): Promise<string>;
    deleteDocument(docId: string): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCells(docId: string): Promise<Array<Cell>>;
    getPresence(docId: string): Promise<Array<Presence>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    heartbeat(docId: string, sessionId: string): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    joinDocument(docId: string, color: string): Promise<string>;
    leaveDocument(docId: string, sessionId: string): Promise<void>;
    listDocuments(): Promise<Array<Document>>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateCell(docId: string, row: bigint, col: bigint, value: string, formula: string): Promise<void>;
}
