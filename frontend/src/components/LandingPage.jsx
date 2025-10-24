import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import './LandingPage.css';

const LandingPage = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const { user, signOut } = useAuth();

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const handleGetStarted = () => {
    if (user) {
      // Redirect to main app
      window.location.href = '/app';
    } else {
      openAuthModal('signup');
    }
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <h2>BinGo</h2>
          </div>
          <div className="nav-actions">
            {user ? (
              <div className="user-menu">
                <span>Welcome, {user.email}</span>
                <button onClick={signOut} className="nav-btn secondary">
                  Sign Out
                </button>
                <button onClick={() => window.location.href = '/app'} className="nav-btn primary">
                  Go to App
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => openAuthModal('login')} className="nav-btn secondary">
                  Sign In
                </button>
                <button onClick={() => openAuthModal('signup')} className="nav-btn primary">
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Smart Waste Collection
              <span className="hero-highlight"> Made Simple</span>
            </h1>
            <p className="hero-description">
              Optimize your waste collection routes with AI-powered bin monitoring and 
              real-time truck tracking. Reduce costs, improve efficiency, and make your city cleaner.
            </p>
            <div className="hero-actions">
              <button onClick={handleGetStarted} className="cta-button primary">
                {user ? 'Go to Dashboard' : 'Get Started Free'}
              </button>
              <button onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })} className="cta-button secondary">
                Learn More
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card">
              <div className="card-header">
                <div className="card-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="card-title">BinGo Dashboard</div>
              </div>
              <div className="card-content">
                <div className="map-preview">
                  <div className="bin-marker high">85%</div>
                  <div className="bin-marker medium">45%</div>
                  <div className="bin-marker low">15%</div>
                  <div className="truck-marker">🚛</div>
                </div>
                <div className="stats">
                  <div className="stat">
                    <span className="stat-number">127</span>
                    <span className="stat-label">Bins Monitored</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">8</span>
                    <span className="stat-label">Trucks Active</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">92%</span>
                    <span className="stat-label">Efficiency</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="features-container">
          <h2 className="features-title">Why Choose BinGo?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Real-time Monitoring</h3>
              <p>Track waste levels in bins across your city with live updates and smart alerts.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🚛</div>
              <h3>Optimized Routes</h3>
              <p>AI-powered route optimization reduces fuel costs and collection time by up to 30%.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Easy Management</h3>
              <p>Intuitive dashboard for monitoring operations and managing your waste collection fleet.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌱</div>
              <h3>Eco-Friendly</h3>
              <p>Reduce carbon footprint with efficient collection schedules and reduced vehicle usage.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Cost Effective</h3>
              <p>Save money on fuel, labor, and maintenance with optimized collection strategies.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Analytics & Reports</h3>
              <p>Comprehensive insights and reports to help you make data-driven decisions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2>Ready to Transform Your Waste Collection?</h2>
          <p>Join cities worldwide using BinGo to create cleaner, more efficient communities.</p>
          <button onClick={handleGetStarted} className="cta-button primary large">
            {user ? 'Access Your Dashboard' : 'Start Your Free Trial'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>BinGo</h3>
              <p>Smart waste collection solutions for modern cities.</p>
            </div>
            <div className="footer-section">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#demo">Demo</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Support</h4>
              <ul>
                <li><a href="#help">Help Center</a></li>
                <li><a href="#contact">Contact Us</a></li>
                <li><a href="#docs">Documentation</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Company</h4>
              <ul>
                <li><a href="#about">About</a></li>
                <li><a href="#careers">Careers</a></li>
                <li><a href="#privacy">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 BinGo. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={closeAuthModal} 
        mode={authMode} 
      />
    </div>
  );
};

export default LandingPage;
