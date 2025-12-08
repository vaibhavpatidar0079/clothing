# Aura Premium Fashion - Setup Guide

## Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL (optional, SQLite works for development)
- Redis (optional, for caching)

## Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment:**
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create `.env` file in backend directory:**
   ```env
   DEBUG=True
   SECRET_KEY=your-secret-key-here
   ALLOWED_HOSTS=localhost,127.0.0.1
   DATABASE_URL=sqlite:///db.sqlite3
   REDIS_URL=redis://localhost:6379/1
   CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
   USE_S3=False
   ```

5. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

6. **Create superuser (optional):**
   ```bash
   python manage.py createsuperuser
   ```

7. **Run server:**
   ```bash
   python manage.py runserver
   ```

   The server will be available at: **http://localhost:8000/**

## Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file (optional):**
   ```env
   VITE_API_URL=http://localhost:8000/api/v1/
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

   The frontend will be available at: **http://localhost:5173** (or the port shown in terminal)

## Important Notes

- **CORS:** Make sure your frontend URL is included in `CORS_ALLOWED_ORIGINS` in the backend `.env` file.

- **Database:** The default setup uses SQLite. For production, switch to PostgreSQL by updating `DATABASE_URL` in `.env`.

## API Documentation

Once the backend is running, access the API documentation at:
- Swagger UI: http://localhost:8000/api/schema/swagger-ui/
- ReDoc: http://localhost:8000/api/schema/redoc/

## Troubleshooting

- **ModuleNotFoundError:** Make sure all dependencies are installed: `pip install -r requirements.txt`
- **CORS errors:** Check that your frontend URL is in `CORS_ALLOWED_ORIGINS`
- **"Connection not secure" or "Invalid response" errors:** 
  - Make sure you're accessing `http://localhost:8000` (not `https://`)
  - Clear browser HSTS cache: Chrome → `chrome://net-internals/#hsts` → Delete `localhost` domain
  - Or use an incognito/private window

