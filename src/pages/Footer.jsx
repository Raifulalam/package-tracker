import './Footer.css'
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTwitter } from 'react-icons/fa';

export default function PremiumFooter() {
    return (
        <footer className="premium-footer">

            <div className="footer-content">

                {/* Brand */}
                <div className="footer-brand">
                    <h2>Nep<span>Xpress</span></h2>
                    <p>Delivering Speed, Delivering Trust.</p>

                    <div className="socials">
                        <FaFacebookF />
                        <FaInstagram />
                        <FaLinkedinIn />
                        <FaTwitter />
                    </div>
                </div>

                {/* Links */}
                <div className="footer-links">
                    <h4>Company</h4>
                    <ul>
                        <li>About</li>
                        <li>Careers</li>
                        <li>Blog</li>
                        <li>Contact</li>
                    </ul>
                </div>

                <div className="footer-links">
                    <h4>Services</h4>
                    <ul>
                        <li>Track Parcel</li>
                        <li>Express Delivery</li>
                        <li>Bulk Shipping</li>
                        <li>International</li>
                    </ul>
                </div>

                <div className="footer-links">
                    <h4>Support</h4>
                    <ul>
                        <li>Help Center</li>
                        <li>Privacy Policy</li>
                        <li>Terms</li>
                        <li>Status</li>
                    </ul>
                </div>

                {/* Newsletter */}
                <div className="footer-newsletter">
                    <h4>Stay Updated</h4>
                    <p>Get updates on offers & deliveries</p>

                    <div className="newsletter-box">
                        <input type="email" placeholder="Enter your email" />
                        <button>Subscribe</button>
                    </div>
                </div>

            </div>

            {/* Bottom */}
            <div className="footer-bottom">
                <p>© {new Date().getFullYear()} NepXpress. All rights reserved.</p>
            </div>

        </footer>
    );
}