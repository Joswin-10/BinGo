# Deployment Guide

## The Problem You're Facing

Your frontend is deployed on Vercel at `https://bin-go-ca4i.vercel.app`, but it's trying to connect to `http://localhost:8000` which only exists on your local machine. You need to deploy your backend and configure the frontend to use the deployed backend URL.

## Quick Fix Options

### Option 1: Deploy Backend to Railway (Recommended)

1. **Create Railway account**: Go to [railway.app](https://railway.app)
2. **Deploy backend**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway new
   railway up --service backend
   ```
3. **Configure Railway**:
   - Set start command: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Set Python version: 3.11+
4. **Get your Railway URL** (e.g., `https://your-app.railway.app`)

### Option 2: Deploy Backend to Render

1. **Create Render account**: Go to [render.com](https://render.com)
2. **Create new Web Service** from your GitHub repo
3. **Configure**:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Get your Render URL** (e.g., `https://your-app.onrender.com`)

### Option 3: Use Mock Data (Quick Demo)

If you just want to demo the frontend without backend:

```javascript
// Replace frontend/src/config.js with:
const config = {
  get apiUrl() {
    return null; // This will trigger mock data mode
  }
};
```

## Update Frontend Configuration

Once you have a deployed backend URL:

### Method 1: Environment Variable (Recommended)

1. **In Vercel Dashboard**:
   - Go to your project settings
   - Add environment variable: `VITE_API_BASE_URL=https://your-backend-url.com`
   - Redeploy

### Method 2: Direct Update

Update `frontend/src/config.js`:
```javascript
return 'https://your-actual-backend-url.com';
```

## Test Your Deployment

1. **Build locally first**:
   ```bash
   npm run build
   npm run preview
   ```

2. **Check browser console** for any remaining errors

3. **Deploy to Vercel**:
   ```bash
   npm run build  # This should work without errors now
   ```

## Current Status

✅ **Fixed**: CORS configuration updated to allow Vercel domain  
✅ **Fixed**: Frontend now uses configurable API URL  
⏳ **Next**: Deploy backend and update API URL  

## Backend Deployment Files Created

- `netlify.toml` - For Netlify deployment
- `vercel.json` - For Vercel deployment  
- Updated `package.json` with production scripts

## Need Help?

1. **Railway**: Easiest for Python backends
2. **Render**: Free tier available
3. **Heroku**: Classic option (paid)
4. **DigitalOcean App Platform**: Good performance

Choose one, deploy your backend, and update the API URL!
