import './LandingPage.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const stats = [
  { value: '24/7', label: 'Live tracking visibility' },
  { value: '3 min', label: 'Average booking flow' },
  { value: '99.2%', label: 'Delivery status sync accuracy' },
];

const capabilities = [
  {
    title: 'Instant booking flow',
    description: 'Create shipments in a polished mobile flow with route-aware pricing, pickup scheduling, and parcel details in one place.',
  },
  {
    title: 'Real-time visibility',
    description: 'Track every parcel with clear customer timelines, field-agent updates, and live operational milestones across Kathmandu, Pokhara, Birgunj, and beyond.',
  },
  {
    title: 'Operations control',
    description: 'Manage senders, receivers, pricing, assignments, and delivery exceptions from one admin-ready workspace.',
  },
];

const workflow = [
  {
    step: '01',
    title: 'Create shipment',
    description: 'Senders enter receiver, location, and parcel details in a mobile-friendly form with live estimates.',
  },
  {
    step: '02',
    title: 'Dispatch and update',
    description: 'Admins assign the right field agent while couriers move the parcel through pickup, linehaul, and final mile.',
  },
  {
    step: '03',
    title: 'Track and deliver',
    description: 'Customers get transparent status updates while teams keep a complete delivery timeline and proof-ready record.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleLogin = () => {
    if (isAuthenticated) {
      navigate(user?.role === 'sender' ? '/dashboard' : `/${user?.role}`);
      return;
    }

    navigate('/login');
  };

  const handleTracking = () => {
    navigate('/track');
  };

  return (
    <div className="landing-page">
      <div className="landing-orb landing-orb-left" />
      <div className="landing-orb landing-orb-right" />

      <header className="landing-topbar">
        <button className="landing-brand" onClick={() => navigate('/')} type="button">
          ParcelOps
        </button>
        <div className="landing-topbar-actions">
          <button className="button-ghost landing-topbar-button" onClick={handleTracking} type="button">
            Track parcel
          </button>
          <button className="button-primary landing-topbar-button" onClick={handleLogin} type="button">
            {isAuthenticated ? 'Open workspace' : 'Sign in'}
          </button>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-panel landing-copy">
            <span className="landing-eyebrow">Deliver Faster. Track Smarter.</span>
            <h1>Reliable parcel delivery for businesses and customers across Nepal.</h1>
            <p className="landing-lead">
              ParcelOps helps teams book shipments, dispatch riders, monitor parcel movement, and keep customers informed in real time from Kathmandu to Pokhara, Birgunj, and every major route in between.
            </p>

            <div className="landing-actions">
              <button className="button-primary" onClick={handleLogin} type="button">
                {isAuthenticated ? 'Go to dashboard' : 'Book a delivery'}
              </button>
              <button className="button-secondary" onClick={handleTracking} type="button">
                Track a shipment
              </button>
            </div>

            <div className="landing-proof">
              {stats.map((item) => (
                <article className="landing-proof-card" key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </article>
              ))}
            </div>
          </div>

          <div className="landing-device">
            <div className="landing-device-frame">
              <div className="landing-device-status">
                <span>ParcelOps Network</span>
                <strong>Live delivery control</strong>
              </div>
              <div className="landing-device-video-wrap">
                <video
                  src="/Delivery-truck.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="landing-device-video"
                />
              </div>
              <div className="landing-device-grid">
                <article>
                  <span>Active lane</span>
                  <strong>Kathmandu to Pokhara</strong>
                </article>
                <article>
                  <span>Shipment status</span>
                  <strong>Out for Delivery</strong>
                </article>
                <article>
                  <span>Expected arrival</span>
                  <strong>Today, 4:30 PM</strong>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-section-wide">
          <div className="landing-section-head">
            <span className="landing-section-kicker">Why ParcelOps</span>
            <h2>Everything a modern delivery platform needs, in one trusted workflow.</h2>
          </div>

          <div className="landing-card-grid">
            {capabilities.map((item) => (
              <article className="landing-feature-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-showcase">
          <div className="landing-panel landing-showcase-copy">
            <span className="landing-section-kicker">Built for daily operations</span>
            <h2>Clear workflows for senders, receivers, agents, and operations teams.</h2>
            <p>
              From public parcel tracking to internal delivery management, ParcelOps is designed to feel fast, dependable, and easy to use on both mobile and desktop.
            </p>
          </div>

          <div className="landing-panel landing-showcase-panel">
            <div className="landing-showcase-list">
              <article>
                <span>Sender</span>
                <strong>Create bookings, manage outgoing parcels, and monitor delivery performance in one place.</strong>
              </article>
              <article>
                <span>Receiver</span>
                <strong>Follow incoming deliveries, check ETA updates, and stay ready for arrival.</strong>
              </article>
              <article>
                <span>Agent</span>
                <strong>Handle assigned deliveries with quick status actions and clear route visibility.</strong>
              </article>
              <article>
                <span>Admin</span>
                <strong>Oversee pricing, dispatch, service exceptions, and network-wide delivery operations.</strong>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-head">
            <span className="landing-section-kicker">How ParcelOps works</span>
            <h2>From booking to doorstep, every delivery step stays visible.</h2>
          </div>

          <div className="landing-workflow">
            {workflow.map((item) => (
              <article className="landing-workflow-card" key={item.step}>
                <span>{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
