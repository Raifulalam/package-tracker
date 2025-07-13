import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [form, setForm] = useState({ email: '', password: '' });
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/auth/login', form);
            login(res.data); // { token, user }
            const role = res.data.user.role;

            if (role === 'sender') navigate('/sender/my-packages');
            else if (role === 'agent') navigate('/agent');
            else if (role === 'admin') navigate('/admin');
        } catch (err) {
            alert(err.response?.data?.msg || 'Login failed');
        }
    };

    return (
        <div style={styles.container}>
            <h2>Login</h2>
            <form onSubmit={handleSubmit} style={styles.form}>
                <input name="email" placeholder="Email" type="email" onChange={handleChange} required />
                <input name="password" placeholder="Password" type="password" onChange={handleChange} required />
                <button type="submit">Login</button>
            </form>
        </div>
    );
};

const styles = {
    container: { maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '10px' },
    form: { display: 'flex', flexDirection: 'column', gap: '10px' }
};

export default Login;
