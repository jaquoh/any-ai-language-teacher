# Backend Setup (PHP + MySQL)

This project supports optional server-side login and profile sync for the Any AI Teacher frontend.

- Frontend expects API endpoints at `/api/*.php` by default.
- If `/api/health.php` is reachable, the app requires login.
- If not reachable, the app falls back to local-only mode.

## Files

- `backend/schema.sql` - MySQL tables (`users`, `user_profiles`, `user_tokens`)
- `backend/migrations/*.sql` - incremental schema updates for existing installs
- `backend/api/*.php` - API endpoints
- `backend/api/config.php.example` - copy to `config.php` and fill DB credentials

## Endpoints

- `GET /api/health.php`
- `POST /api/register.php`
- `POST /api/login.php`
- `POST /api/logout.php`
- `GET /api/profile.php`
- `PUT /api/account.php` (username + profile image URL)
- `POST /api/change-password.php`
- `GET /api/progress.php`
- `PUT /api/progress.php`

## Current feature support (backend)

- Account registration + login (`name` + password)
- Password hashing (`password_hash`) and token-based sessions
- Multiple active sessions per user
- Expired token cleanup on login/logout (per-user)
- Profile retrieval + progress/lesson-loop storage
- Account profile updates (username + avatar image URL)
- Password change endpoint

## InfinityFree deployment (free plan)

1. Create a MySQL database in the InfinityFree control panel.
2. Open phpMyAdmin and run SQL from `backend/schema.sql`.
3. In your hosting file manager (usually `htdocs/`):
   - create `htdocs/api/`
   - upload all files from `backend/api/` into that folder
4. In `htdocs/api/`, copy `config.php.example` to `config.php`.
5. Edit `config.php` with the database host/name/user/password from InfinityFree.
6. Add `htdocs/api/.htaccess` so PHP receives the `Authorization` header (required on InfinityFree in many cases).
7. Upload your frontend `dist/` files to `htdocs/`.

### InfinityFree `.htaccess` (Authorization header passthrough)

Create `htdocs/api/.htaccess` with:

```apache
CGIPassAuth On
RewriteEngine On
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule .* - [E=HTTP_AUTHORIZATION:%1]
SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
```

## Existing installs: DB migration for profile image

If you already created the database before this feature, run:

- `backend/migrations/2026-02-22_add_users_avatar_url.sql`

This adds `users.avatar_url` used by the account profile image field.

## Existing installs: upload new API files (account features)

If you deployed an older backend version, also upload these newer endpoints:

- `backend/api/account.php`
- `backend/api/change-password.php`

## Optional frontend env override

If your API is on another domain/path, build with:

```bash
VITE_API_BASE_URL="https://your-domain.com/api" npm run build
```

If frontend and API are on the same domain at `/api`, no env var is needed.

## Verification checklist

1. Open `/api/health.php` and confirm `{\"ok\":true}`.
2. Create/login via the app.
3. Confirm `users`, `user_tokens`, and `user_profiles` rows are created/updated.
4. Change username/profile image/password in `Settings` and confirm the API accepts the requests.
