# User Guide

This guide covers how each role uses the ResLife system.

---

## Logging In

1. Go to the ResLife URL provided by your administrator
2. **Students:** Enter your school email and password, or click "Register" to create an account
3. **Staff:** Click "Sign in with Google (Staff)" to use your school Google account, or use email/password
4. After login, you'll see your role-specific dashboard

---

## Admin Guide

As an admin, you have full access to all modules and all buildings.

### Dashboard

Your dashboard shows system-wide stats:
- **Total Students** — number of students currently in housing
- **Occupancy** — percentage of beds filled, with available bed count
- **Open Requests** — active maintenance requests, with urgent count highlighted
- **Incidents (7d)** — incidents in the last 7 days, with pending review count

Below the stats, you'll see **Recent Incidents** and **Maintenance Queue** panels.

### Managing Buildings and Rooms

1. Click **Buildings** in the sidebar
2. Each building card shows occupancy percentage with a color-coded progress bar
3. Click a building to see rooms organized by floor
4. Each room card shows:
   - Room number and type (Single, Double, Triple, Suite)
   - Bed spaces (A, B, C, D) with current occupant names
   - Occupancy count
5. Click a student name to view their full profile

### Managing Students

1. Click **Students** in the sidebar
2. Use the search bar to find students by name, email, or student ID
3. Each row shows the student's current room assignment
4. Click a student to see:
   - Contact information
   - Current room assignment
   - Full assignment history (all past rooms)

### Reviewing Incident Reports

1. Click **Incidents** in the sidebar
2. Use search to filter by location, type, or description
3. Each report shows type, severity badge, and current status
4. Click a report to see full details including:
   - Students involved (clickable links to their profiles)
   - Full description and AI summary (if generated)
   - **Review Actions**: Mark as Reviewed or Escalate

### Monitoring Maintenance

1. Click **Maintenance** in the sidebar
2. Filter by status (Reported, Assigned, In Progress, Completed)
3. View request details including status timeline and work notes

### Sending Announcements

1. Click **Announcements** in the sidebar
2. Click **New Announcement**
3. Fill in:
   - **Title** — clear, descriptive subject
   - **Body** — full announcement text
   - **Priority** — Normal, Important, or Urgent
     - Important/Urgent announcements also send email notifications
   - **Audience** — All Students, Specific Building(s), or Staff Only
4. Click **Publish Announcement**

---

## Staff Guide

As residence life staff, you see data scoped to your assigned building(s).

### Your Dashboard

Shows the same layout as Admin but filtered to your assigned buildings:
- Student count, occupancy, and requests for your buildings only
- Recent incidents and maintenance for your area

### Day-to-Day Tasks

**Filing an Incident Report:**

1. Go to **Incidents** → **New Report**
2. Search and select the student(s) involved
3. Choose the incident type and severity
4. Enter the date, time, and location
5. Write the description of what happened
6. Optional: Click **Summarize with AI** to generate a professional version
7. Submit — the report goes to PENDING_REVIEW status

**Checking Room Assignments:**

1. Go to **Buildings** → click your building
2. See all rooms by floor with current occupants
3. Identify empty beds at a glance

**Sending Building Announcements:**

1. Go to **Announcements** → **New Announcement**
2. Set audience to **Specific Building(s)** and select your building
3. Only students in that building will receive the notification

---

## Maintenance Staff Guide

Your view is focused on the maintenance work queue.

### Maintenance Queue

1. Click **Maintenance** in the sidebar
2. You see all open requests sorted by most recent
3. Use the status filter to focus on specific stages:
   - **Reported** — new requests waiting for assignment
   - **Assigned** — assigned to a technician
   - **In Progress** — work has started
   - **Completed** — finished work

### Working a Request

1. Click on a request to see details
2. Click **Assign to Me** to take ownership
3. Click **Start Work** when you begin
4. Add **Notes** to document what you're doing
5. Click **Mark Complete** when finished

The requester (student or staff) can see status updates on their request.

---

## Student Guide

As a student, you can view your room assignment, submit maintenance requests, and receive announcements.

### Your Dashboard

Shows:
- Your current room assignment
- Your maintenance requests with status
- Recent announcements directed to you

### Submitting a Maintenance Request

1. Click **Maintenance** → **New Request**
2. Your room is auto-filled based on your assignment
3. Select the **Category**: Plumbing, Electrical, Furniture, HVAC, or Other
4. Set the **Priority**:
   - **Low** — cosmetic or minor issue
   - **Medium** — functional but needs attention
   - **High** — affecting daily use
   - **Urgent** — safety concern or emergency
5. Describe the issue in detail
6. Click **Submit Request**

You can track your request status in the Maintenance section. You'll see when it's been assigned, when work starts, and when it's completed.

### Viewing Announcements

1. Click **Announcements** in the sidebar
2. You'll see announcements targeted to all students or your specific building
3. The notification bell (top right) shows your unread count
4. Click a notification to read the full announcement

### Registering a New Account

1. Go to the login page and click **Register**
2. Enter your full name
3. Use your school email address (must end with the school domain)
4. Choose a password (minimum 6 characters)
5. Your account is created with **Student** role

---

## Notifications

The notification bell in the top-right corner shows:
- **Red badge** with unread count
- Click to open the dropdown with recent notifications
- Click a notification to navigate to the related content and mark it as read
- Notifications are generated automatically when:
  - An announcement is published that targets you
  - (Future: maintenance status updates, incident follow-ups)

For **Important** and **Urgent** announcements, you will also receive an email notification.

---

## Tips

- **Search is your friend** — All list pages have search. Use it to quickly find students, incidents, or requests.
- **Status badges** — Color-coded badges give quick visual status. Red = urgent/critical, yellow = needs attention, green = resolved.
- **Mobile friendly** — The app works on your phone. The sidebar collapses into a menu icon on small screens.
- **Bookmark it** — Save the URL to your browser or phone home screen for quick access.
