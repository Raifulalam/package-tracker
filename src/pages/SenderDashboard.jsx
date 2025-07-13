import React from 'react';
import { Link } from 'react-router-dom';
import SenderNav from '../components/SenderNav';

const SenderDashboard = () => {
    return (
        <>
            <SenderNav />
            <div style={styles.container}>
                <h2>Welcome to Sender Dashboard</h2>
                <div style={styles.links}>
                    <Link to="/sender/create">📦 Create New Delivery</Link>
                    <Link to="/sender/my-packages">📄 My Packages</Link>
                </div>
            </div>
        </>
    );
};

const styles = {
    container: {
        padding: '20px',
        textAlign: 'center'
    },
    links: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        marginTop: '20px'
    }
};

export default SenderDashboard;
