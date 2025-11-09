// API Configuration
export const API_CONFIG = {
  get baseUrl() {
    // Check if we have an environment variable set
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
    
    // If we're in development (localhost), use local backend
    if (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
      return 'http://localhost:8000';
    }
    
    // Default to Railway deployment URL
    return 'https://bingo-production-091b.up.railway.app';
  },
  retryCount: 3,
  retryDelay: 1000, // 1 second
};

// Helper function to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry failed requests
export const fetchWithRetry = async (url, options = {}, retries = API_CONFIG.retryCount) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            if (i === retries - 1) throw error;
            await delay(API_CONFIG.retryDelay * (i + 1)); // Exponential backoff
            console.log(`Retrying request to ${url}, attempt ${i + 2}/${retries}`);
        }
    }
};

// Export endpoints for easier access
export const ENDPOINTS = {
    BINS: '/api/bins',
    TRUCKS: '/api/trucks',
    SIMULATE: '/api/simulate/step'
};
