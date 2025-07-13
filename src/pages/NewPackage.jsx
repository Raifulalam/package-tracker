import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NewPackage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        receiverName: '',
        receiverAddress: ''
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/package', form, {
                headers: {
                    Authorization: `Bearer ${user.token}`
                }
            });
            alert('Package created successfully!');
            navigate('/'); // or to dashboard
        } catch (err) {
            alert(err.response?.data?.msg || 'Failed to create package');
        }
    };

    return (
        <div style={styles.container}>
            <h2>Create New Delivery</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
                <input
                    type="text"
                    name="receiverName"
                    placeholder="Receiver Name"
                    value={form.receiverName}
                    onChange={handleChange}
                    required
                />
                <textarea
                    name="receiverAddress"
                    placeholder="Receiver Address"
                    value={form.receiverAddress}
                    onChange={handleChange}
                    required
                />
                <button type="submit">Send Package</button>
            </form>
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '400px',
        margin: '40px auto',
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '10px',
        textAlign: 'center'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
    }
};

export default NewPackage;
