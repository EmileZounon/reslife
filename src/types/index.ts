import { Timestamp } from "firebase/firestore";

// ─── Enums ───────────────────────────────────────────

export type UserRole = "STUDENT" | "STAFF" | "MAINTENANCE" | "ADMIN";
export type BuildingStaffRole = "RA" | "RD" | "MANAGER";
export type RoomType = "SINGLE" | "DOUBLE" | "TRIPLE" | "SUITE";
export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";
export type BedSpace = "A" | "B" | "C" | "D";
export type AssignmentStatus = "ACTIVE" | "MOVED" | "GRADUATED" | "CHECKED_OUT";

export type IncidentType = "RULE_VIOLATION" | "HEALTH" | "BEHAVIOR" | "GENERAL";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "DRAFT" | "PENDING_REVIEW" | "REVIEWED" | "ESCALATED";

export type MaintenanceCategory = "PLUMBING" | "ELECTRICAL" | "FURNITURE" | "HVAC" | "OTHER";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type MaintenanceStatus = "REPORTED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED";

export type AnnouncementPriority = "NORMAL" | "IMPORTANT" | "URGENT";
export type AnnouncementAudience = "ALL" | "BUILDING" | "STAFF";
export type NotificationType = "ANNOUNCEMENT" | "MAINTENANCE" | "INCIDENT" | "SYSTEM";
export type NotificationChannel = "IN_APP" | "EMAIL";

// ─── Documents ───────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  studentId?: string;
  avatar?: string;
  createdAt: Timestamp;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  floors: number;
  createdAt: Timestamp;
}

export interface BuildingStaff {
  id: string;
  buildingId: string;
  userId: string;
  role: BuildingStaffRole;
}

export interface Room {
  id: string;
  buildingId: string;
  number: string;
  floor: number;
  type: RoomType;
  capacity: number;
  status: RoomStatus;
  gender?: string;
}

export interface RoomAssignment {
  id: string;
  userId: string;
  roomId: string;
  buildingId: string;
  bedSpace: BedSpace;
  startDate: Timestamp;
  endDate?: Timestamp | null;
  status: AssignmentStatus;
}

export interface RoomSelectionWindow {
  id: string;
  open: boolean;
  openedAt?: Timestamp | null;
  closedAt?: Timestamp | null;
  openedBy: string;
}

export type RoomChangeStatus = "PENDING" | "APPROVED" | "DENIED";

export interface RoomChangeRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  // Current room
  currentAssignmentId: string;
  currentBuildingId: string;
  currentBuildingName: string;
  currentRoomNumber: string;
  currentBedSpace: string;
  // Desired room
  desiredRoomId: string;
  desiredBuildingId: string;
  desiredBuildingName: string;
  desiredRoomNumber: string;
  desiredBedSpace: string;
  // Status
  status: RoomChangeStatus;
  requestedAt: Timestamp;
  resolvedAt?: Timestamp | null;
  resolvedBy?: string | null;
  resolvedByName?: string | null;
  denyReason?: string | null;
}

export interface IncidentReport {
  id: string;
  reporterId: string;
  studentIds: string[];
  type: IncidentType;
  severity: Severity;
  date: string;
  time: string;
  location: string;
  description: string;
  aiSummary?: string;
  attachmentUrls: string[];
  status: IncidentStatus;
  createdAt: Timestamp;
}

export interface MaintenanceRequest {
  id: string;
  requesterId: string;
  roomId: string;
  buildingId: string;
  category: MaintenanceCategory;
  priority: Priority;
  description: string;
  status: MaintenanceStatus;
  assigneeId?: string;
  attachmentUrls: string[];
  notes: MaintenanceNote[];
  createdAt: Timestamp;
  completedAt?: Timestamp | null;
}

export interface MaintenanceNote {
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Timestamp;
}

export interface Announcement {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  buildingIds: string[];
  publishAt?: Timestamp | null;
  expiresAt?: Timestamp | null;
  published: boolean;
  createdAt: Timestamp;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  channel: NotificationChannel;
  relatedId?: string;
  sentAt: Timestamp;
  readAt?: Timestamp | null;
}
