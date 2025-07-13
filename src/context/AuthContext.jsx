import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('courier_auth');
        return stored ? JSON.parse(stored) : null;
    });

    const login = (data) => {
        setUser(data);
        localStorage.setItem('courier_auth', JSON.stringify(data));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('courier_auth');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
