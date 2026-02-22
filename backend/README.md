# Backend Setup (PHP + MySQL)

This project now supports optional server-side login and profile sync.

- Frontend expects API endpoints at `/api/*.php` by default.
- If `/api/health.php` is reachable, the app requires login.
- If not reachable, the app falls back to local-only mode.

## Files

- `backend/schema.sql` - MySQL tables (`users`, `user_profiles`, `user_tokens`)
- `backend/api/*.php` - API endpoints
- `backend/api/config.php.example` - copy to `config.php` and fill DB credentials

## Endpoints

- `GET /api/health.php`
- `POST /api/register.php`
- `POST /api/login.php`
- `POST /api/logout.php`
- `GET /api/profile.php`
- `GET /api/progress.php`
- `PUT /api/progress.php`

## 125mb.com deployment (free plan)

1. Create MySQL database in your 125mb.com control panel.
2. Open phpMyAdmin and run SQL from `backend/schema.sql`.
3. In your hosting file manager:
   - create `/public_html/api/`
   - upload all files from `backend/api/` into that folder
4. In `/public_html/api/`, copy `config.php.example` to `config.php`.
5. Edit `config.php` with the database host/name/user/password from 125mb.com.
6. Upload your frontend `dist/` files to `/public_html/`.

## Optional frontend env override

If your API is on another domain/path, build with:

```bash
VITE_API_BASE_URL="https://your-domain.com/api" npm run build
```

If frontend and API are on the same domain at `/api`, no env var is needed.
