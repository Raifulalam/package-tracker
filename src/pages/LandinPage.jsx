
import "./LandingPage.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function LandingPage() {
    const navigate = useNavigate();

    const { isAuthenticated, user } = useAuth();


    const handlelogin = () => {
        if (isAuthenticated) {
            navigate(user?.role === 'sender' ? '/dashboard' : `/${user?.role}`);
            return;
        }

        navigate('/login');
    }
    const handleTracking = () => {
        navigate('/track');
    }
    return (
        <div className="landing">
            {/* Header */}
            <header className="landing__header">
                <h1 className="landing__title">
                    Welcome to E-Transport Services
                </h1>
                <p className="landing__subtitle">
                    A Trusted Courier & Logistics Partner Across Nepal
                </p>
            </header>



            {/* Hero */}
            <section className="hero" aria-label="Hero">
                <div className="hero__left">
                    <h2 className="hero__h1">Fast. Reliable. Trackable.</h2>
                    <p className="hero__p">
                        We provide secure pickup and delivery across Nepal with real-time tracking and 24/7
                        support.
                    </p>

                    <div className="hero__cta">
                        <button className="btn btn--primary" onClick={handlelogin}>Book Delivery</button>
                        <button className="btn btn--ghost" onClick={handleTracking}>Track Package</button>
                    </div>
                </div>

                <div className="hero__canvas" role="img" aria-label="3D truck model">
                    <video
                        src="/Delivery-truck.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="hero__video"
                    />
                </div>
            </section>

            {/* CTA Row */}
            <div className="cta-row">
                <button className="btn btn--primary" onClick={handlelogin}>Explore Our Services</button>
            </div>

            {/* Why Choose Us */}
            <section className="section">
                <h3 className="section__title">Why Choose Us?</h3>
                <p className="section__lead">
                    At <strong>E-Transport Services</strong>, we deliver speed, safety, and transparency — small
                    parcels or bulk cargo, backed by modern tracking and friendly support.
                </p>

                <div className="cards" role="list">
                    <article className="card" role="listitem">
                        <div className="card__title">Reliable Delivery</div>
                        <div className="card__desc">On-time and secure delivery across Nepal.</div>
                    </article>

                    <article className="card" role="listitem">
                        <div className="card__title">Real-Time Tracking</div>
                        <div className="card__desc">Track your shipment live anytime, anywhere.</div>
                    </article>

                    <article className="card" role="listitem">
                        <div className="card__title">24/7 Support</div>
                        <div className="card__desc">Friendly customer support whenever you need help.</div>
                    </article>
                </div>
            </section>

            {/* Our Services */}
            <section className="section" style={{ marginTop: 20, marginBottom: 40 }}>
                <h3 className="section__title">Our Services</h3>
                <p className="section__lead">Comprehensive courier and logistics solutions tailored for you.</p>

                <div className="cards" role="list">
                    <article className="card" role="listitem">
                        <div className="card__title">Express Courier</div>
                        <div className="card__desc">Same-day and next-day parcel delivery options.</div>
                    </article>

                    <article className="card" role="listitem">
                        <div className="card__title">Cargo Transport</div>
                        <div className="card__desc">Efficient handling for business shipments and bulk cargo.</div>
                    </article>

                    <article className="card" role="listitem">
                        <div className="card__title">International Shipping</div>
                        <div className="card__desc">Global reach via trusted partner networks.</div>
                    </article>
                </div>
            </section>
        </div>
    );
}
