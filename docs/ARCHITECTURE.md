# Architecture

## Overview

ResLife is a Next.js 16 full-stack application using Firebase as its backend-as-a-service. The architecture prioritizes simplicity for a solo developer while supporting 500+ students.

```
┌─────────────────────────────────────────────────────────┐
│                     Vercel (Hosting)                     │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Next.js App  │  │  API Routes  │  │  Vercel Cron │  │
│  │  (React SSR)  │  │  (Serverless)│  │  (Daily)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                    Firebase Platform                     │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Firebase     │  │  Firestore   │  │  Firebase    │  │
│  │  Auth         │  │  (Database)  │  │  Storage     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Resend (Email)     │  │  Claude API (AI)     │
└─────────────────────┘  └─────────────────────┘
```

## Key Design Decisions

### 1. Full Firebase Stack (not PostgreSQL + Prisma)

**Decision:** Use Firebase Auth + Firestore + Storage instead of PostgreSQL.

**Rationale:** The project owner already had Firebase set up. Firebase eliminates the need for a separate database server, provides built-in auth with Google SSO, and offers a generous free tier. For 500 students, Firestore handles the query patterns without issue.

**Trade-offs:**
- Lost: Relational queries, Prisma type-safe ORM, SQL joins
- Gained: Zero database management, built-in auth, real-time listeners (future), free tier

### 2. Client-Side Auth Guard (not Middleware)

**Decision:** Use a React `AuthGuard` component instead of Next.js middleware.

**Rationale:** Next.js 16 deprecated the `middleware.ts` convention in favor of `proxy`. Firebase Auth uses client-side IndexedDB for session persistence, making client-side route protection the natural fit. The AuthGuard redirects unauthenticated users to `/login` before rendering protected content.

**Flow:**
```
User visits /buildings
    → AuthGuard checks useAuth()
    → loading=true → show spinner
    → user=null → redirect to /login
    → user exists → render page
```

### 3. Lazy Firebase Initialization

**Decision:** Firebase SDKs are initialized lazily via getter functions, not at import time.

**Rationale:** Next.js pre-renders pages during build. If Firebase initializes at import time with empty env vars, the build crashes. Lazy initialization (`getFirebaseAuth()`, `getFirebaseDb()`) defers initialization to runtime when env vars are available.

```typescript
// Instead of: export const auth = getAuth(app);  // crashes at build
// We use:     export function getFirebaseAuth() { ... }  // safe
```

### 4. Denormalized `buildingId` on Assignments and Requests

**Decision:** Store `buildingId` directly on `roomAssignments` and `maintenanceRequests`, even though it's derivable from the room.

**Rationale:** Firestore doesn't support joins. Without denormalization, fetching "all assignments in Building X" would require fetching all rooms in the building first, then querying assignments for each room. Denormalization allows a single `where("buildingId", "==", id)` query.

### 5. Role-Based Navigation Filtering

**Decision:** Filter sidebar navigation items by role in the client, not via separate route groups.

**Rationale:** All roles share the same `(dashboard)` layout. The `getNavItems(role)` function returns only the links each role should see. Page-level permission checks prevent direct URL access to unauthorized pages. This avoids duplicating the layout across multiple route groups.

## Authentication Flow

```
Registration (Students):
  1. Student fills email + password on /register
  2. Client checks email domain matches NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN
  3. Firebase Auth creates account
  4. AuthProvider creates Firestore user doc with role=STUDENT
  5. Redirect to dashboard

Login (Email/Password):
  1. User enters credentials on /login
  2. Firebase Auth validates
  3. onAuthStateChanged fires → AuthProvider loads user doc from Firestore
  4. Session cookie set for future visits
  5. Redirect to dashboard

Login (Google SSO — Staff):
  1. User clicks "Sign in with Google"
  2. Firebase Auth popup flow
  3. If no Firestore user doc exists → create one with role=STAFF
  4. Redirect to dashboard
```

## Module Architecture

Each module follows the same pattern:

```
src/app/(dashboard)/[module]/
├── page.tsx          # List view (search, filter, cards/table)
├── new/page.tsx      # Create form
└── [id]/page.tsx     # Detail view (with actions)
```

**Data flow:** Each page fetches data directly from Firestore using the client SDK. Mutations (create, update) use Firestore's `addDoc`, `updateDoc`, and `setDoc`. There are no intermediate API routes for CRUD — the Firebase client SDK handles it directly with Firestore security rules controlling access.

**API routes** are used only for operations that require server-side secrets:
- `/api/ai/summarize` — needs ANTHROPIC_API_KEY
- `/api/notifications/email` — needs RESEND_API_KEY
- `/api/cron/publish-announcements` — needs Firebase Admin SDK

## Notification System

```
Staff creates announcement (priority=URGENT, audience=ALL)
    │
    ├──→ Firestore: Create announcement document
    │
    ├──→ Firestore: Batch-create notification documents
    │    (one per student, type=ANNOUNCEMENT, channel=IN_APP)
    │
    └──→ API call: POST /api/notifications/email
         (sends email via Resend to all recipients)

Student opens app
    │
    └──→ NotificationBell component
         ├──→ Query: notifications where userId=me, ordered by sentAt
         ├──→ Show unread count badge
         └──→ Click notification → mark read → navigate to content
```

## Security Model

| Layer | Mechanism |
|-------|-----------|
| Authentication | Firebase Auth (email/password + Google OAuth) |
| Route Protection | Client-side AuthGuard component |
| Data Access | Firestore Security Rules (test mode for MVP — production rules needed) |
| API Protection | Server-side env var checks, cron secret verification |
| Email Restriction | Client-side domain check on registration |
| Role Authorization | `permissions.ts` helpers checked in page components |

**Important for production:** Firestore is currently in test mode. Before going live, write security rules that enforce:
- Users can only read/write their own notifications
- Only staff/admin can create incident reports
- Only maintenance/admin can update maintenance request status
- Students can only read announcements targeted to them
