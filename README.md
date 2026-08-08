# Eureka - Startup Competition Management System

Eureka is a complete, production-ready, feature-rich Startup Competition Management platform featuring a dark, purple-neon modern responsive UI. It is built using Node.js, Express, Supabase (Postgres & Storage), and Vanilla HTML/CSS/JavaScript.

This project is fully optimized for **Vercel Serverless Functions** and **Supabase**, utilizing memory-based file uploads (no local disk writes) and database-backed persistent sessions to handle the stateless, ephemeral nature of serverless architectures.

---

## Technical Stack & Architecture

- **Backend**: Node.js & Express (API routes structured inside Vercel-compatible `/api/index.js`).
- **Frontend**: Vanilla HTML5, CSS3, and JavaScript, served statically.
- **Database**: Supabase PostgreSQL.
- **File Storage**: Supabase Storage (Memory-buffer file streaming via Multer).
- **Session Management**: Persistent database-backed sessions utilizing `connect-pg-simple` (synced to the PostgreSQL database so login sessions persist across stateless serverless container instances).
- **Security**: Secure HTTP headers (Helmet), Rate Limiting (express-rate-limit), Parameterized Queries (via Supabase JS SDK client), Input Validation, and Password Hashing (bcryptjs).
- **Email Notifications**: Nodemailer configured for Brevo SMTP with console-logging fallbacks.

---

## 1. Supabase Project Setup

1. Sign in to [Supabase](https://supabase.com/).
2. Click **New Project** and select your organization.
3. Choose a project name, database password, and your hosting region.
4. Wait for the project database to spin up.

### SQL Schema Execution
1. In the Supabase Dashboard, click on the **SQL Editor** tab from the left navigation bar.
2. Click **New Query**.
3. Copy the entire contents of the [`supabase-schema.sql`](supabase-schema.sql) file in this repository and paste it into the editor.
4. Click **Run** to execute. This will create all required tables (`users`, `teams`, `team_members`, `student_notes`, `settings`, and `"session"`), constraints, indexes, and seed default countdown settings.

### Storage Bucket Setup
1. In the Supabase Dashboard, click on the **Storage** tab from the left navigation bar.
2. Click **New Bucket**.
3. Name the bucket **`uploads`** (this matches the bucket name in the backend code).
4. Set the bucket to **Public** (so that public URLs can be generated directly by the app).
5. Under **Bucket Policies**, click **New Policy** to allow uploading:
   - Choose **Allowed operations**: `INSERT`, `UPDATE`, `SELECT`.
   - Set target role to `authenticated` or public as appropriate, or click **Create policy from scratch** to allow all uploads for testing. Since the backend server uploads files using the secure `SUPABASE_SERVICE_ROLE_KEY`, it bypasses RLS policies automatically. Therefore, you do not need to create complex insert policies; just ensuring the bucket is **Public** is sufficient to allow read access via the generated public URLs.

---

## 2. Local Environment Setup

1. Clone the repository and navigate to the project directory.
2. Copy the environment variables template:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in the placeholders:
   - **`DATABASE_URL`**: Obtain this from Supabase Dashboard -> **Settings** -> **Database** -> **Connection Pooler** (Choose Mode: **Transaction** or **Session**, copy the connection string).
   - **`SUPABASE_URL`**: Find this under Settings -> **API** -> **Project URL**.
   - **`SUPABASE_SERVICE_ROLE_KEY`**: Find this under Settings -> **API** -> **Project API Keys** -> **service_role** key (Do NOT share this key with anyone!).
   - **`SESSION_SECRET`**: A secure random string for encrypting cookie sessions.
   - **`SMTP_HOST` / `SMTP_USER` / `SMTP_PASS`**: Your Nodemailer Brevo SMTP credentials (optional, falls back to console logs if left empty).
4. Install the dependencies:
   ```bash
   npm install
   ```

---

## 3. Local Testing & Verification

Run the following commands locally to verify syntax, compile files, and test:

* **Verify File Compilation & Syntax**:
  ```bash
  npm test
  ```
  *(This compiles `db.js` and `api/index.js` to ensure there are no syntax or reference errors).*

* **Run Local Development Server**:
  ```bash
  npm run dev
  ```
  Open your browser and navigate to `http://localhost:3000`.

---

## 4. Vercel Project Configuration

### Deployment via Vercel Dashboard (Recommended)
1. Push your code to your GitHub repository (specifically the **`align-main`** branch or merge it into `main`).
2. Log in to [Vercel](https://vercel.com/) and click **Add New** -> **Project**.
3. Import your GitHub repository.
4. In the Project Configuration settings:
   - **Framework Preset**: Choose **Other**.
   - **Root Directory**: Keep it as the default **`.`** (the project root).
5. Expand the **Environment Variables** section and add the following keys from your `.env` file:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET`
   - `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `FROM_EMAIL` (Optional)
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` (Optional, seeds default admin)
6. Click **Deploy**. Vercel will build the project and deploy it.

### Deployment via Vercel CLI
If you prefer deploying via terminal commands:
1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Log in to your Vercel account:
   ```bash
   vercel login
   ```
3. Link your project and deploy:
   ```bash
   vercel
   ```
4. Set the environment variables in your Vercel project settings dashboard, then deploy to production:
   ```bash
   vercel --prod
   ```

---

## 5. Post-Deployment Testing Checklist

Once deployed, go through the following sequence to verify all systems:
1. **Landing Page**: Verify the homepage loads and the blinking monogram background is animated correctly.
2. **Student Registration**: Register a new student at `/register.html`. Verify you are redirected to the Student Dashboard.
3. **Profile Picture Upload**: In the student dashboard, upload a profile picture. Inspect the page, verify the picture renders, and confirm the image URL points to `https://[your-ref].supabase.co/storage/v1/object/public/...` (direct Supabase Storage link).
4. **Team Registration**: Create a team with 1 to 5 members and select a problem statement. Verify you receive the success response and the email is sent/logged.
5. **Admin Login**: Log out, then log in using the administrator credentials (`admin@eureka.com` / `AdminPass123!`). Verify you are redirected to the Admin Panel (`/admin.html`).
6. **Timetable Rearrangement**: In the admin panel, change the pitch status or sequence of teams and click save. Log back in as a student and verify the update matches.

---

## 6. Common Errors & Fixes

* **`404: NOT_FOUND`**:
  * *Reason*: The root directory is incorrectly configured to `public` in Vercel settings, or an old deployment is being visited.
  * *Fix*: Keep the Vercel root directory set to `.`. Vercel automatically uses the `vercel.json` rewrites to route static assets inside the `public/` directory and API requests to `/api/index.js`.
* **`getaddrinfo ENOTFOUND db.[project-ref].supabase.co`**:
  * *Reason*: Direct connection strings resolve to IPv6-only addresses on Supabase, which Vercel serverless containers do not support.
  * *Fix*: Go to Supabase Settings -> Database -> Connection Pooler and copy the connection string that resolves to the `pooler.supabase.com` domain on port **6543** (which supports IPv4). Update your Vercel `DATABASE_URL` settings and redeploy.
* **Admin dashboard showing "Failed to retrieve database directories"**:
  * *Reason*: Ephemeral session loss. In-memory sessions do not survive across different serverless invocations.
  * *Fix*: We have implemented the database session store (`connect-pg-simple`) which writes sessions to PostgreSQL. Ensure your `DATABASE_URL` environment variable is fully configured on Vercel and you have redeployed.
