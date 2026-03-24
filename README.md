# ResLife — Residence Life Management System

A modern, web-based housing management platform built for small colleges and boarding schools. ResLife replaces spreadsheets, paper forms, and scattered emails with a unified system for managing student housing, incident reports, maintenance requests, and communications.

**Live Demo:** [reslife-red.vercel.app](https://reslife-red.vercel.app)

---

## Features

### Four Core Modules

| Module | Description |
|--------|-------------|
| **Student & Room Assignment** | Manage buildings, rooms, and bed spaces. Assign, move, and track students with full history. |
| **Incident Reports** | Log rule violations, health concerns, and behavior issues. AI-powered summarization for professional reports. |
| **Maintenance Requests** | Submit, assign, track, and complete maintenance work orders with status lifecycle and notes. |
| **Announcements & Notifications** | Send targeted announcements to all students, specific buildings, or staff. In-app and email delivery. |

### Role-Based Access

| Role | Access |
|------|--------|
| **Admin** | Full access to all modules, all buildings, system-wide dashboard |
| **Staff** | Building-scoped access, incident reports, room assignments for assigned buildings |
| **Maintenance** | Maintenance queue, assign/complete work orders, add notes |
| **Student** | View own room, submit maintenance requests, receive announcements |

### Dashboard

Role-aware dashboard showing:
- Total students in housing
- Occupancy percentage and available beds
- Open maintenance requests (with urgent count)
- Recent incidents (7-day window)
- Recent incidents list and maintenance queue

### Additional Features

- **AI Chatbot Assistant** — Floating chatbot that explains features, guides users through tasks, and provides clickable navigation links. Powered by Claude API.
- **AI Incident Summarization** — One-click rewrite of incident descriptions into professional report format (powered by Claude API)
- **Email Notifications** — Automatic email delivery for important/urgent announcements via Resend
- **Notification Bell** — In-app notification center with unread count
- **Responsive Design** — Works on desktop and mobile browsers
- **School Email Restriction** — Student registration limited to configured email domain

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, React 19) |
| Database | [Firebase Firestore](https://firebase.google.com/docs/firestore) (NoSQL) |
| Authentication | [Firebase Auth](https://firebase.google.com/docs/auth) (Email/Password + Google SSO) |
| File Storage | [Firebase Storage](https://firebase.google.com/docs/storage) |
| UI Components | [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Email | [Resend](https://resend.com/) |
| AI | [Claude API](https://docs.anthropic.com/) (Anthropic) |
| Deployment | [Vercel](https://vercel.com/) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project ([console.firebase.google.com](https://console.firebase.google.com))
- npm

### 1. Clone the Repository

```bash
git clone https://github.com/EmileZounon/reslife.git
cd reslife
npm install
```

### 2. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com) and create a new project
2. **Security → Authentication → Get Started**
   - Enable **Email/Password** provider
   - Enable **Google** provider (select support email)
3. **Database and Storage → Firestore Database → Create Database**
   - Choose **Start in test mode**
   - Select a region close to your users
4. **Project Settings (gear icon) → General → Your apps**
   - Click the web icon (`</>`) to register a web app
   - Copy the `firebaseConfig` values
5. **Project Settings → Service accounts**
   - Click **Generate new private key**
   - Download the JSON file

### 3. Configure Environment Variables

Copy the values into `.env.local`:

```env
# Firebase Client SDK (from step 4 above)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin SDK (from the downloaded JSON file)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# School email domain for student registration
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=school.edu

# Optional: Resend API key for email notifications
RESEND_API_KEY=

# Optional: Anthropic API key for AI summarization
ANTHROPIC_API_KEY=
```

### 4. Seed Development Data

```bash
npx tsx scripts/seed.ts
```

This creates:
- 14 users (1 admin, 2 staff, 1 maintenance, 10 students)
- 3 buildings with 17 rooms
- 6 room assignments
- 1 sample incident report, maintenance request, and announcement

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Test Accounts

All accounts use password: `password123`

| Role | Email |
|------|-------|
| Admin | `admin@school.edu` |
| Staff (RA) | `ra.johnson@school.edu` |
| Staff (RD) | `rd.williams@school.edu` |
| Maintenance | `maint.garcia@school.edu` |
| Student | `alice.wang@school.edu` |
| Student | `bob.smith@school.edu` |

---

## Deployment

### Deploy to Vercel

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add all environment variables from `.env.local` to the Vercel project settings
4. Deploy

Or use the CLI:

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Post-Deployment

Add your Vercel domain to Firebase authorized domains:

1. Firebase Console → **Security → Authentication → Settings**
2. Under **Authorized domains**, add your Vercel URL (e.g., `your-app.vercel.app`)

---

## Project Structure

```
reslife/
├── scripts/
│   └── seed.ts                      # Firestore seed script
├── src/
│   ├── app/
│   │   ├── (auth)/                  # Login and register pages
│   │   ├── (dashboard)/             # Protected routes (all modules)
│   │   │   ├── layout.tsx           # Sidebar + header shell
│   │   │   ├── page.tsx             # Role-aware dashboard
│   │   │   ├── buildings/           # Building & room management
│   │   │   ├── students/            # Student profiles & assignments
│   │   │   ├── incidents/           # Incident reports
│   │   │   ├── maintenance/         # Maintenance requests
│   │   │   └── announcements/       # Communications
│   │   └── api/                     # API routes (AI, email, cron)
│   ├── components/
│   │   ├── ui/                      # shadcn/ui base components
│   │   ├── auth-guard.tsx           # Client-side route protection
│   │   └── notification-bell.tsx    # Notification dropdown
│   ├── lib/
│   │   ├── auth-context.tsx         # Firebase Auth provider + hooks
│   │   ├── firebase.ts             # Firebase client SDK
│   │   ├── firebase-admin.ts       # Firebase Admin SDK
│   │   ├── permissions.ts          # Role-based access control
│   │   └── validations.ts          # Zod form validation schemas
│   └── types/
│       └── index.ts                # TypeScript types for Firestore docs
├── .env.local                       # Environment variables (not committed)
├── vercel.json                      # Vercel cron configuration
└── package.json
```

---

## V2 Roadmap

- [ ] Push notifications (PWA)
- [ ] Move-in / move-out inspection forms
- [ ] Visitor tracking
- [ ] Package tracking
- [ ] Parent portal
- [ ] Billing integration
- [ ] AI policy assistant chatbot
- [ ] Advanced reporting and analytics
- [ ] Bulk CSV import for students
- [ ] Full audit log

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## License

This project is proprietary software developed for educational institution use.
