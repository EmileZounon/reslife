import type { User, UserRole } from "@/types";

export function hasRole(user: User | null, ...roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export function isAdmin(user: User | null): boolean {
  return hasRole(user, "ADMIN");
}

export function isStaff(user: User | null): boolean {
  return hasRole(user, "STAFF", "ADMIN");
}

export function isMaintenance(user: User | null): boolean {
  return hasRole(user, "MAINTENANCE", "ADMIN");
}

export function isStudent(user: User | null): boolean {
  return hasRole(user, "STUDENT");
}

export function requireRole(user: User | null, ...roles: UserRole[]): void {
  if (!hasRole(user, ...roles)) {
    throw new Error("Unauthorized: insufficient permissions");
  }
}

/**
 * Check if a staff member has access to a specific building.
 * Admins have access to all buildings.
 * Staff members only have access to buildings they're assigned to.
 *
 * @param user - The current user
 * @param buildingId - The building to check access for
 * @param assignedBuildingIds - Building IDs the staff member is assigned to
 */
export function canAccessBuilding(
  user: User | null,
  buildingId: string,
  assignedBuildingIds: string[]
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "STAFF") return assignedBuildingIds.includes(buildingId);
  return false;
}

/**
 * Navigation items filtered by role.
 */
export function getNavItems(role: UserRole) {
  const items = [
    { label: "Dashboard", href: "/", icon: "LayoutDashboard", roles: ["STUDENT", "STAFF", "MAINTENANCE", "ADMIN"] as UserRole[] },
    { label: "Buildings", href: "/buildings", icon: "Building2", roles: ["STAFF", "ADMIN"] as UserRole[] },
    { label: "Students", href: "/students", icon: "Users", roles: ["STAFF", "ADMIN"] as UserRole[] },
    { label: "Occupancy", href: "/occupancy", icon: "DoorOpen", roles: ["STAFF", "ADMIN"] as UserRole[] },
    { label: "Room Requests", href: "/room-requests", icon: "ArrowLeftRight", roles: ["STAFF", "ADMIN"] as UserRole[] },
    { label: "Room Selection", href: "/room-selection", icon: "BedDouble", roles: ["STUDENT"] as UserRole[] },
    { label: "Incidents", href: "/incidents", icon: "AlertTriangle", roles: ["STAFF", "ADMIN"] as UserRole[] },
    { label: "Maintenance", href: "/maintenance", icon: "Wrench", roles: ["STUDENT", "STAFF", "MAINTENANCE", "ADMIN"] as UserRole[] },
    { label: "Announcements", href: "/announcements", icon: "Megaphone", roles: ["STUDENT", "STAFF", "MAINTENANCE", "ADMIN"] as UserRole[] },
  ];

  return items.filter((item) => item.roles.includes(role));
}
