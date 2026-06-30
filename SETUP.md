# Setup

## Open access (default — no config needed)

Clone, install, and run. The app does not require a login.

### Backend

```
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```
cd frontend
npm install
npm run dev
```

App opens at `http://localhost:5173`. All routes work without authentication.

The auth feature is fully written but **wired OFF by default**.

## Opt-in: enable login

To turn on authentication:

### 1. Backend (`backend/.env`)

```
AUTH_ENABLED=true
JWT_SECRET=<random-string>
SMTP_USER=<your-gmail-address>
SMTP_PASS=<16-char-app-password>
SMTP_FROM=<your-gmail-address>
```

Then in `backend/main.py`, uncomment:

- `from routers.auth import router as auth_router`
- `app.include_router(auth_router, prefix="/api/v1", tags=["auth"])`

### 2. Frontend (`frontend/.env`)

```
VITE_API_BASE_URL=http://localhost:8000/v1
```

Then in `frontend/src/App.tsx`:

- Wrap content with `<AuthProvider>`
- Wrap the routes in `<ProtectedRoute>`
- Add `<Route path="login" element={<LoginPage />} />`

### Gmail App Password

See `GMAIL_SETUP.md` for Gmail SMTP setup.
