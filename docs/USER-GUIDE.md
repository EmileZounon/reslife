# ResLife User Guide

A complete guide for administrators, staff, and students using the ResLife Residence Life Management System.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Room Management (Admin/Staff)](#3-room-management-adminstuff)
4. [Room Selection (Students)](#4-room-selection-students)
5. [Approving Room Change Requests (Admin/Staff)](#5-approving-room-change-requests-adminstaff)
6. [Other Modules](#6-other-modules)
7. [Test Accounts](#7-test-accounts)
8. [FAQ](#8-frequently-asked-questions)

---

## 1. Getting Started

ResLife is a web-based housing management platform designed for small colleges and boarding schools. It replaces spreadsheets, paper forms, and scattered emails with a unified system for managing student housing, incident reports, maintenance requests, and communications.

### 1.1 Accessing the System

1. Open your web browser and navigate to your institution's ResLife URL
2. Enter your school email address (e.g., `yourname@school.edu`)
3. Enter your password
4. Click **Sign In** to access your dashboard

> **Tip:** You can also sign in with Google SSO if your school has it enabled.

### 1.2 User Roles

Your role determines what features you can access:

| Role | Access Level |
|------|-------------|
| **Admin** | Full access to all modules, all buildings, system-wide dashboard, settings |
| **Staff (RA/RD)** | Building-scoped access, incident reports, room assignments, room change approvals |
| **Maintenance** | Maintenance queue, assign and complete work orders, add notes |
| **Student** | View own room, submit maintenance requests, receive announcements, select rooms |

---

## 2. Dashboard

After logging in, you land on the Dashboard. What you see depends on your role.

### 2.1 Admin/Staff Dashboard

The admin and staff dashboard shows four key metrics:

- **Total Students** — Number of students in the housing system
- **Occupancy** — Percentage of beds occupied and available bed count
- **Open Requests** — Active maintenance requests with urgent count highlighted
- **Incidents (7d)** — Recent incidents in the past seven days

Below the metrics, you will see **Recent Incidents** and the **Maintenance Queue**.

### 2.2 Student Dashboard

Students see a simplified dashboard with their maintenance requests and relevant announcements.

---

## 3. Room Management (Admin/Staff)

Room management is the core of ResLife. This section covers all the tools available to administrators and staff for managing student housing assignments.

### 3.1 Occupancy Dashboard

Navigate to **Occupancy** in the sidebar. This page gives you a complete picture of room occupancy across all buildings.

- **Summary Cards** — At the top, four cards show Empty Rooms, Partially Filled, Full Rooms, and Beds Available
- **Filters** — Use the search bar to find a room, building, or student by name. Filter by building or by status (Empty, Partial, Full, Maintenance)
- **Room Table** — Each row shows the building, room number and floor, room type, occupancy status, current occupants (linked to their profiles), and available bed letters

### 3.2 Manual Room Assignment

You can assign students to rooms directly from the building detail page.

1. Go to **Buildings** and click on a building name
2. Find the room with an empty bed and click the **+** icon next to the empty bed
3. In the dialog, select a student from the dropdown (only unassigned students are shown)
4. Choose the bed space (A, B, C, or D)
5. Click **Assign** to confirm

> **Tip:** The system prevents double-booking. If a bed is already occupied or the student already has a room, the assignment will be rejected with a clear error message.

### 3.3 Move-Out Processing

When a student moves out, graduates, or transfers rooms:

1. Go to the building detail page
2. Find the student's bed and click the **move-out icon** (arrow icon next to their name)
3. Select a reason: **Checked Out**, **Moved to Another Room**, or **Graduated**
4. Click **Confirm Move-Out**

The room will automatically update to "Available" when the last student moves out.

### 3.4 Bulk CSV Upload

For assigning many students at once (e.g., at the start of a semester), use the bulk upload feature.

1. Go to **Occupancy** and click **Bulk Upload** (or go to **Students** and click **Bulk Upload**)
2. Download the CSV template by clicking **Download Template**
3. Fill in the template with student data. Required columns: Name, Email, StudentID, Building, RoomNumber, Bed
4. Drag and drop the CSV file onto the upload area, or click **Choose File**
5. Review the preview table. Valid rows show a green checkmark. Invalid rows show the error in red
6. Click **Assign X Students** to process all valid rows
7. Review the results. Each row shows whether it succeeded or failed with a reason

> **Tip:** The system validates each row against the database: building must exist, room must exist, bed must not be occupied, and the student must not already have a room. Maximum 500 rows per upload.

### 3.5 CSV Template Format

| Name | Email | StudentID | Building | RoomNumber | Bed |
|------|-------|-----------|----------|------------|-----|
| Alice Wang | alice.wang@school.edu | STU-001 | North Hall | 101 | A |
| Bob Smith | bob.smith@school.edu | STU-002 | North Hall | 101 | B |

---

## 4. Room Selection (Students)

When the administration opens the room selection window, students can browse and select their own rooms.

### 4.1 First-Time Room Selection

If you do not have a room yet and room selection is open:

1. Click **Room Selection** in the sidebar
2. Browse available rooms. You can filter by building using the dropdown
3. Each room card shows the building, floor, room type, and which beds are available or taken
4. Click **Select This Room** on your preferred room
5. Choose your bed from the available options
6. Click **Confirm Selection** to lock in your choice

Room selection is first come, first served. Once you confirm, your room is assigned immediately.

### 4.2 Requesting a Room Change

If you already have a room and want to switch:

1. Go to **Room Selection** in the sidebar
2. You will see your current room assignment and a **Request Room Change** button
3. Click **Request Room Change** to browse available rooms
4. Select a room and bed, then click **Submit Request**
5. Your request will be sent to administration for approval

> **Tip:** Your current room stays until the request is approved. You can only have one pending request at a time. You will see the status of your request on the Room Selection page.

### 4.3 When Room Selection is Closed

If the selection window is not open, you will see a message: "Room Selection is Closed." Contact your RA if you need to make a room change.

---

## 5. Approving Room Change Requests (Admin/Staff)

When students request room changes, administrators and staff can review and act on them.

1. Click **Room Requests** in the sidebar
2. By default, you see pending requests. Use the dropdown to filter by Approved, Denied, or All
3. Each request shows the student's name, their current room, and the room they want to move to
4. Click **Approve** to complete the room change (the old room is freed, the new room is assigned automatically)
5. Click **Deny** to reject the request. You can provide an optional reason

> **Tip:** When you approve a request, the system uses a database transaction to ensure no double-booking occurs. If the desired bed was taken in the meantime, the approval will fail with an error.

### 5.1 Controlling the Selection Window

Only administrators can open or close the room selection window:

1. Go to **Occupancy** and click the **Settings** button
2. Click **Open Selection** to allow students to select rooms
3. Click **Close Selection** to stop students from selecting rooms

When the window is closed, students see "Room Selection is Closed" when they visit the page.

---

## 6. Other Modules

### 6.1 Incident Reports (Staff/Admin)

Staff can log rule violations, health concerns, and behavior issues. Each report includes the involved students, severity, date, time, location, and a description. The **AI Summarize** button can rewrite your description into a professional report format.

### 6.2 Maintenance Requests

Students and staff can submit maintenance requests. Each request tracks the room, category (plumbing, electrical, furniture, HVAC, other), priority, and status. Maintenance staff see a queue of assigned work orders and can add notes as work progresses.

### 6.3 Announcements

Administrators and staff can create announcements targeted to all students, specific buildings, or staff only. Announcements can be marked as Normal, Important, or Urgent. Urgent announcements trigger email notifications.

### 6.4 AI Chatbot

The floating chat bubble in the bottom-right corner is an AI assistant that can answer questions about the system, explain features, and provide clickable navigation links to help you find what you need.

---

## 7. Test Accounts

For demonstration and testing purposes, the following accounts are available.

**All accounts use the password:** `password123`

| Role | Email |
|------|-------|
| Admin | `admin@school.edu` |
| Staff (RA) | `ra.johnson@school.edu` |
| Staff (RD) | `rd.williams@school.edu` |
| Maintenance | `maint.garcia@school.edu` |
| Student | `alice.wang@school.edu` |
| Student | `bob.smith@school.edu` |
| Student | `carol.davis@school.edu` |
| Student | `david.lee@school.edu` |
| Student | `emma.brown@school.edu` |
| Student | `frank.wilson@school.edu` |
| Student | `grace.kim@school.edu` |
| Student | `henry.taylor@school.edu` |
| Student | `iris.martinez@school.edu` |
| Student | `jack.anderson@school.edu` |

> **Important:** Change default passwords before deploying to production.

---

## 8. Frequently Asked Questions

**Q: What happens if two students try to select the same bed at the same time?**
The system uses database transactions to prevent double-booking. The first student to confirm gets the bed. The second student will see an error message saying the bed is no longer available.

**Q: Can a student have more than one room?**
No. Each student can only have one active room assignment. If they try to select a second room, they will be prompted to request a room change instead.

**Q: What happens when a room change request is approved?**
The student's old room assignment is automatically ended (marked as "Moved"), and the new room assignment is created. The old room becomes available for other students.

**Q: Can students select rooms at any time?**
No. The administrator must open the room selection window first. When the window is closed, students cannot select or change rooms through the system.

**Q: What is the maximum number of students I can upload at once?**
The bulk upload supports up to 500 students per CSV file. For larger groups, split the file into multiple uploads.

**Q: Who can see the Room Requests page?**
Only administrators and staff (RAs and RDs) can see and act on room change requests. Students can only see the status of their own request on their Room Selection page.
