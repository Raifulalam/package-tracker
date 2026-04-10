import { Link } from 'react-router-dom';
import './auth.css';

const LandingPage = () => {
  return (
    <div className="auth-shell">
      <section className="auth-showcase landing-shell">
        <span className="auth-showcase-badge">NexExpree</span>
        <h1>Courier tracking, delivery control, and verified handoff in one premium stack.</h1>
        <p>NexExpree is a full-stack courier operations platform for admins, senders, receivers, and field agents with live shipment updates, live agent availability, payment tracking, and OTP / QR delivery confirmation.</p>

        <div className="landing-hero-actions">
          <Link className="button-primary" to="/register">Create account</Link>
          <Link className="button-secondary" to="/login">Sign in</Link>
          <Link className="button-ghost" to="/track">Track shipment</Link>
        </div>

        <div className="landing-grid">
          <article>
            <strong>Admin control center</strong>
            <span>Search shipments, assign only online agents, review analytics, and monitor live network activity.</span>
          </article>
          <article>
            <strong>Sender workspace</strong>
            <span>Create shipments, watch real-time progress, review payment status, and keep a clean delivery history.</span>
          </article>
          <article>
            <strong>Receiver verification</strong>
            <span>Track incoming parcels, confirm delivery with OTP or QR, and get live notifications when the handoff is near.</span>
          </article>
          <article>
            <strong>Agent operations</strong>
            <span>Toggle online availability, receive assignments in real time, and finish deliveries with secure verification.</span>
          </article>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
