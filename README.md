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

## Installation & Setup

1. **Clone or Open the Project Directory**
   Ensure all files are placed in your current workspace directory.

2. **Install Dependencies**
   Run the following command to download all required packages:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Rename `.env.example` to `.env` or create a new `.env` file in the root directory:
   ```env
   PORT=3000
   SESSION_SECRET=super_secret_purple_neon_session_key

   # Brevo SMTP Configuration (Fill this to send actual emails)
   BREVO_SMTP_HOST=smtp-relay.brevo.com
   BREVO_SMTP_PORT=587
   BREVO_SMTP_USER=your_brevo_smtp_username
   BREVO_SMTP_PASSWORD=your_brevo_smtp_password
   BREVO_SMTP_FROM="Eureka Competition <no-reply@eureka.com>"

   # Default Admin Credentials
   ADMIN_EMAIL=admin@eureka.com
   ADMIN_PASSWORD=AdminPass123!
   ```

4. **Initialize the Database**
   The application initializes the SQLite database file (`database.db`) automatically upon the first startup. It creates the tables (`users`, `teams`, `team_members`, `student_notes`) and seeds the default administrator account.

---

## Running the Application

### Development Mode (Auto-reloads on file changes)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Once running, navigate to [http://localhost:3000](http://localhost:3000) in your web browser.

---

## Default Administrator Credentials
- **Email**: `admin@eureka.com`
- **Password**: `AdminPass123!`

*(You can edit these default admin credentials in your `.env` file before launching for the first time)*

---

## File Upload Constraints
- **Profile Avatars**: Allowed formats: `.jpeg`, `.jpg`, `.png`, `.gif`, `.webp`. Size limit: `2MB`.
- **Notice Attachments**: Allowed formats: `.jpeg`, `.jpg`, `.png`, `.gif`, `.webp`. Size limit: `3MB`.
