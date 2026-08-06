# Eureka - Startup Competition Management System

Eureka is a complete, feature-rich Startup Competition Management platform featuring a dark, purple-neon modern responsive UI. It is built using Node.js, Express, SQLite3, and Vanilla HTML/CSS/JavaScript.

## Features

- **Authentication System**: Secure student registration, unified login (students & admins), and session-based logout using `bcrypt` and `express-session`.
- **Student Dashboard**: 
  - Edit profile information and upload/update profile pictures via `multer`.
  - Dynamically register a team with 1 to 5 members.
  - Select predefined problem statement tracks or provide custom statements.
  - View team details, role designations, and registration review statuses.
  - View notices, notes, and attachments posted to their dashboard by organizers.
- **Admin Control Panel**:
  - Live statistics display (Total Students, Registered Teams, Pending Reviews, Approved Projects).
  - Manage registered students (Edit details, delete account, send notices/notes with optional image attachments).
  - Manage team registrations (Approve status, reject status, edit team details, delete registrations).
- **Email Notifications**: Automatic registration confirmation emails sent to the Team Leader using `nodemailer` and Brevo SMTP, with console logging fallbacks for offline testing.

---

## Prerequisites

- **Node.js** (v16 or higher recommended)
- **npm** (comes bundled with Node.js)

---

