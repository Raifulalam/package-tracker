import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Register = () => {
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'sender',
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/auth/register', form);
            alert('Registration successful! Please login.');
            navigate('/login');
        } catch (err) {
            alert(err.response?.data?.msg || 'Registration failed');
        }
    };

    return (
        <div style={styles.container}>
            <h2>Register</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
                <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
                <input name="email" placeholder="Email" type="email" value={form.email} onChange={handleChange} required />
                <input name="password" placeholder="Password" type="password" value={form.password} onChange={handleChange} required />
                <select name="role" value={form.role} onChange={handleChange}>
                    <option value="sender">Sender</option>
                    <option value="agent">Delivery Agent</option>
                    <option value="admin">Admin</option>
                </select>
                <button type="submit">Register</button>
            </form>
        </div>
    );
};

const styles = {
    container: { maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '10px' },
    form: { display: 'flex', flexDirection: 'column', gap: '10px' }
};

export default Register;
