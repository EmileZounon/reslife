import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const incidentSchema = z.object({
  studentIds: z.array(z.string()).min(1, "Select at least one student"),
  type: z.enum(["RULE_VIOLATION", "HEALTH", "BEHAVIOR", "GENERAL"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

export const maintenanceSchema = z.object({
  roomId: z.string().min(1, "Room is required"),
  category: z.enum(["PLUMBING", "ELECTRICAL", "FURNITURE", "HVAC", "OTHER"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

export const announcementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  body: z.string().min(10, "Body must be at least 10 characters"),
  priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]),
  audience: z.enum(["ALL", "BUILDING", "STAFF"]),
  buildingIds: z.array(z.string()).optional(),
});

export const singleAssignmentSchema = z.object({
  userId: z.string().min(1, "Student is required"),
  roomId: z.string().min(1, "Room is required"),
  buildingId: z.string().min(1, "Building is required"),
  bedSpace: z.enum(["A", "B", "C", "D"]),
});

export const bulkAssignmentRowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  studentId: z.string().min(1, "Student ID is required"),
  building: z.string().min(1, "Building is required"),
  roomNumber: z.string().min(1, "Room number is required"),
  bed: z.enum(["A", "B", "C", "D"], { message: "Bed must be A, B, C, or D" }),
});

export const selectionWindowSchema = z.object({
  open: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type IncidentInput = z.infer<typeof incidentSchema>;
export type MaintenanceInput = z.infer<typeof maintenanceSchema>;
export type AnnouncementInput = z.infer<typeof announcementSchema>;
export type SingleAssignmentInput = z.infer<typeof singleAssignmentSchema>;
export type BulkAssignmentRow = z.infer<typeof bulkAssignmentRowSchema>;
export type SelectionWindowInput = z.infer<typeof selectionWindowSchema>;
