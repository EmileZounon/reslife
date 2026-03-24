# API Reference

ResLife uses Firebase Firestore as its primary data store and Next.js API routes for server-side operations.

---

## API Routes

### POST `/api/ai/summarize`

Rewrites an incident report description into a professional format using Claude AI.

**Request Body:**

```json
{
  "description": "Students were playing loud music after quiet hours in room 101",
  "type": "RULE_VIOLATION",
  "severity": "MEDIUM"
}
```

**Response:**

```json
{
  "summary": "On the evening in question, two students residing in Room 101 of North Hall were found to be in violation of the established quiet hours policy..."
}
```

**Error Responses:**
- `400` — Missing description
- `503` — ANTHROPIC_API_KEY not configured
- `500` — AI service error

---

### POST `/api/notifications/email`

Sends email notifications for important/urgent announcements via Resend.

**Request Body:**

```json
{
  "title": "Spring Break Move-Out Deadline",
  "body": "All students must vacate rooms by March 28 at 5 PM.",
  "recipientIds": ["uid1", "uid2"]
}
```

**Response:**

```json
{ "sent": true }
```

**Error Responses:**
- `503` — RESEND_API_KEY not configured
- `500` — Email delivery failure

---

### GET `/api/cron/publish-announcements`

Vercel cron job that publishes scheduled announcements and generates notifications. Runs daily at midnight.

**Authentication:** Requires `CRON_SECRET` bearer token in production.

**Response:**

```json
{ "published": 2 }
```

---

## Firestore Collections

### `users`

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | User's email address |
| `name` | string | Full name |
| `role` | enum | `STUDENT` \| `STAFF` \| `MAINTENANCE` \| `ADMIN` |
| `phone` | string? | Phone number |
| `studentId` | string? | Student ID (students only) |
| `avatar` | string? | Profile photo URL |
| `createdAt` | Timestamp | Account creation date |

**Document ID:** Firebase Auth UID

---

### `buildings`

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Building name (e.g., "North Hall") |
| `address` | string | Street address |
| `floors` | number | Number of floors |
| `createdAt` | Timestamp | Creation date |

---

### `buildingStaff`

Junction table linking staff to buildings.

| Field | Type | Description |
|-------|------|-------------|
| `buildingId` | string | Reference to building |
| `userId` | string | Reference to user (staff) |
| `role` | enum | `RA` \| `RD` \| `MANAGER` |

---

### `rooms`

| Field | Type | Description |
|-------|------|-------------|
| `buildingId` | string | Reference to building |
| `number` | string | Room number (e.g., "101") |
| `floor` | number | Floor number |
| `type` | enum | `SINGLE` \| `DOUBLE` \| `TRIPLE` \| `SUITE` |
| `capacity` | number | Max occupants (1-4) |
| `status` | enum | `AVAILABLE` \| `OCCUPIED` \| `MAINTENANCE` |
| `gender` | string? | Gender restriction |

---

### `roomAssignments`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Reference to student |
| `roomId` | string | Reference to room |
| `buildingId` | string | Reference to building (denormalized for queries) |
| `bedSpace` | enum | `A` \| `B` \| `C` \| `D` |
| `startDate` | Timestamp | Assignment start |
| `endDate` | Timestamp? | Assignment end (`null` = currently assigned) |
| `status` | enum | `ACTIVE` \| `MOVED` \| `GRADUATED` |

**Business Rules:**
- A student can only have one `ACTIVE` assignment at a time
- Moving a student closes the old assignment (sets `endDate` and status) and creates a new one
- Assignments are never deleted — only closed

---

### `incidentReports`

| Field | Type | Description |
|-------|------|-------------|
| `reporterId` | string | Staff member who filed the report |
| `studentIds` | string[] | Students involved |
| `type` | enum | `RULE_VIOLATION` \| `HEALTH` \| `BEHAVIOR` \| `GENERAL` |
| `severity` | enum | `LOW` \| `MEDIUM` \| `HIGH` \| `CRITICAL` |
| `date` | string | Incident date (YYYY-MM-DD) |
| `time` | string | Incident time (HH:MM) |
| `location` | string | Where it happened |
| `description` | string | Detailed description |
| `aiSummary` | string? | AI-generated professional summary |
| `attachmentUrls` | string[] | Uploaded file URLs |
| `status` | enum | `DRAFT` \| `PENDING_REVIEW` \| `REVIEWED` \| `ESCALATED` |
| `createdAt` | Timestamp | Report creation date |

**Workflow:** `DRAFT` → `PENDING_REVIEW` → `REVIEWED` or `ESCALATED`

---

### `maintenanceRequests`

| Field | Type | Description |
|-------|------|-------------|
| `requesterId` | string | Who submitted the request |
| `roomId` | string | Affected room |
| `buildingId` | string | Building (denormalized) |
| `category` | enum | `PLUMBING` \| `ELECTRICAL` \| `FURNITURE` \| `HVAC` \| `OTHER` |
| `priority` | enum | `LOW` \| `MEDIUM` \| `HIGH` \| `URGENT` |
| `description` | string | Issue description |
| `status` | enum | `REPORTED` \| `ASSIGNED` \| `IN_PROGRESS` \| `COMPLETED` |
| `assigneeId` | string? | Maintenance staff assigned |
| `attachmentUrls` | string[] | Photos |
| `notes` | MaintenanceNote[] | Timestamped work notes |
| `createdAt` | Timestamp | Request creation |
| `completedAt` | Timestamp? | When completed |

**MaintenanceNote:**

```typescript
{
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Timestamp;
}
```

**Workflow:** `REPORTED` → `ASSIGNED` → `IN_PROGRESS` → `COMPLETED`

---

### `announcements`

| Field | Type | Description |
|-------|------|-------------|
| `authorId` | string | Who created it |
| `authorName` | string | Author display name |
| `title` | string | Announcement title |
| `body` | string | Full text |
| `priority` | enum | `NORMAL` \| `IMPORTANT` \| `URGENT` |
| `audience` | enum | `ALL` \| `BUILDING` \| `STAFF` |
| `buildingIds` | string[] | Target buildings (when audience = BUILDING) |
| `publishAt` | Timestamp? | Scheduled publish time |
| `expiresAt` | Timestamp? | Auto-hide date |
| `published` | boolean | Whether visible to recipients |
| `createdAt` | Timestamp | Creation date |

---

### `notifications`

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | Recipient |
| `type` | enum | `ANNOUNCEMENT` \| `MAINTENANCE` \| `INCIDENT` \| `SYSTEM` |
| `title` | string | Notification title |
| `body` | string | Preview text (max 200 chars) |
| `read` | boolean | Has been read |
| `channel` | enum | `IN_APP` \| `EMAIL` |
| `relatedId` | string? | Link to source document |
| `sentAt` | Timestamp | When sent |
| `readAt` | Timestamp? | When read |
