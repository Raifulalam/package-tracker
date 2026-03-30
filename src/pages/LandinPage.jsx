import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import "./LandingPage.css";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
    const navigate = useNavigate();
    const handlelogin = () => {
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
                    <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
                        <ambientLight intensity={0.6} />
                        <directionalLight position={[5, 5, 5]} intensity={1.2} />
                        <OrbitControls enableZoom={false} />

                        {/* simple truck body */}
                        <mesh rotation={[0, Math.PI / 6, 0]} position={[0, -0.25, 0]}>
                            <boxGeometry args={[3, 1.4, 1.4]} />
                            <meshStandardMaterial color="#f7c948" />
                        </mesh>

                        {/* wheels (rotation prop is array on mesh) */}
                        {[
                            [-1, -0.95, 0.72],
                            [1, -0.95, 0.72],
                            [-1, -0.95, -0.72],
                            [1, -0.95, -0.72],
                        ].map((pos, i) => (
                            <mesh key={i} position={pos} rotation={[Math.PI / 2, 0, 0]}>
                                <cylinderGeometry args={[0.28, 0.28, 0.6, 32]} />
                                <meshStandardMaterial color="#111827" />
                            </mesh>
                        ))}
                    </Canvas>
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
