import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SenderNav from '../components/SenderNav';

const NewDelivery = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        receiverName: '',
        receiverPhone: '',
        pickupAddress: '',
        deliveryAddress: '',
        itemType: '',
        weight: '',
        instructions: '',
        deliveryType: 'normal'
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
            alert('Package created!');
            navigate('/sender/my-packages');
        } catch (err) {
            alert(err.response?.data?.msg || 'Error creating package');
        }
    };

    return (
        <>
            <SenderNav />
            <div style={styles.container}>
                <h2>Create New Delivery</h2>
                <form onSubmit={handleSubmit} style={styles.form}>
                    <input name="receiverName" placeholder="Receiver Name" onChange={handleChange} required />
                    <input name="receiverPhone" placeholder="Receiver Phone" onChange={handleChange} required />
                    <input name="pickupAddress" placeholder="Pickup Address" onChange={handleChange} required />
                    <input name="deliveryAddress" placeholder="Delivery Address" onChange={handleChange} required />
                    <input name="itemType" placeholder="Item Type" onChange={handleChange} required />
                    <input name="weight" placeholder="Weight (kg)" onChange={handleChange} required />
                    <textarea name="instructions" placeholder="Special Instructions" onChange={handleChange} />
                    <select name="deliveryType" onChange={handleChange}>
                        <option value="normal">Normal</option>
                        <option value="express">Express</option>
                    </select>
                    <button type="submit">Submit Delivery</button>
                </form>
            </div>
        </>
    );
};

const styles = {
    container: { maxWidth: '500px', margin: '20px auto', padding: '20px' },
    form: { display: 'flex', flexDirection: 'column', gap: '10px' }
};

export default NewDelivery;
