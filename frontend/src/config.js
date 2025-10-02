// API Configuration
const config = {
  get apiUrl() {
    // Check if we have an environment variable set
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
    
    // If we're in development (localhost), use local backend
    if (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
      return 'http://localhost:8000';
    }
    
    // For production, you need to deploy your backend and update this URL
    // Options:
    // 1. Set VITE_API_BASE_URL environment variable in Vercel
    // 2. Deploy backend to Railway/Render/Heroku and update the URL below
    // 3. Use a mock API service for demo purposes
    
    // Replace this with your actual Render URL after deployment
    return 'https://bingo-backend.onrender.com';
    
    // After deployment, replace with your actual URL:
    // Railway: https://your-app.railway.app
    // Render: https://your-app.onrender.com
    // Fly.io: https://your-app.fly.dev
  }
};

export default config;
