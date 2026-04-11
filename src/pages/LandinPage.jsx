// LandingPage.jsx
import { Link } from 'react-router-dom';
import './landing.css';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const LandingPage = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="landing-container">
      {/* NAVBAR */}
      <header className="navbar">
        <div className="logo"><img src="logo.png" alt="logo" height={60} /></div>

        <nav className={`nav-links ${menuOpen ? 'active' : ''}`}>
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <Link to="/login" className="nav-btn">Login</Link>
        </nav>

        <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <h1>Smart Courier Tracking & Delivery Platform</h1>
          <p>
            Manage shipments, track deliveries in real-time, and verify handoffs securely using OTP & QR.
          </p>

          <div className="hero-buttons">
            <Link to="/register" className="btn primary">Get Started</Link>
            <Link to="/track" className="btn secondary">Track Shipment</Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="features">
        <h2>Platform Features</h2>
        <div className="feature-grid">
          <div className="card">
            <h3>Admin Dashboard</h3>
            <p>Manage deliveries, assign agents, and monitor operations in real-time.</p>
          </div>
          <div className="card">
            <h3>Real-time Tracking</h3>
            <p>Track shipments live with status updates and delivery timelines.</p>
          </div>
          <div className="card">
            <h3>Secure Delivery</h3>
            <p>OTP and QR verification ensures safe parcel handoff.</p>
          </div>
          <div className="card">
            <h3>Agent System</h3>
            <p>Agents can go online/offline and receive live assignments.</p>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="about">
        <div className="about-content">
          <h2>About NexExpree</h2>
          <p>
            NexExpree is a modern SaaS-based courier solution designed to simplify logistics operations. Built with scalability in mind, it supports admins, senders, receivers, and delivery agents in one unified platform.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <h2>Start delivering smarter today</h2>
        <Link to="/register" className="btn primary">Create Account</Link>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="footer">
        <div className="footer-grid">
          <div>
            <h3>NexExpree</h3>
            <p>Next-gen courier tracking system.</p>
          </div>
          <div>
            <h4>Links</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#about">About</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <p>Email: support@nexexpree.com</p>
            <p>Phone: +91 9876543210</p>
          </div>
        </div>
        <p className="copyright">© 2026 NexExpree. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;

