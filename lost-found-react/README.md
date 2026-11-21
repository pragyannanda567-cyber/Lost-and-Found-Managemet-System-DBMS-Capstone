# FindIt Campus — React + Express + MySQL + Role-based Login

## Setup (Windows)
1. In MySQL Workbench run `backend/users_migration.sql` **if you already have the items and claims tables**. For a fresh database run `backend/schema.sql` instead. Do not rerun the sample INSERT statements if you already have data.
2. In `backend`, copy `config.example.json` to `config.json` and set your MySQL root password. MySQL port is **3306**, not 4000.
3. In a backend terminal: `npm install`
4. Set a JWT signing secret (32+ random characters). In PowerShell, run `$env:JWT_SECRET = 'replace-this-with-a-long-random-secret-32chars'` in the **same terminal** you use to start the backend. Do not commit this secret.
5. Run `npm run create-admin` in that backend terminal, and follow prompts to create the first admin account. The password is visible while typing in the console, so use a private terminal.
6. Run `npm run dev` in backend. API: http://localhost:4000/api/health
7. In another terminal, from the main `lost-found-react` folder, run `npm install` then `npm run dev`. Frontend: http://localhost:5173
8. Students sign up on the site; admins sign in using the account created in step 5.

## Roles
- Student: sign up, log in, browse items, submit lost/found reports, submit claims, view their claims.
- Admin: log in, browse all items and claims, approve/reject claims, delete reports.
- Public sign-up always creates **Student**, never Admin.
- Server validates JWT and admin permissions; passwords are bcrypt-hashed.

## Database
Tables: `items`, `claims`, `users`. Existing items and claims are retained when running `users_migration.sql`.

## Notes
This is an educational prototype. For production add rate limiting, HTTPS, stricter CORS, user-ID foreign keys for reports/claims, stronger audit trails, and a proper admin provisioning flow. The API identifies legacy claims by claimant name, which is not a secure ownership model.
