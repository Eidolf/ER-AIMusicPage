import React, { useState } from 'react';

interface LoginProps {
    onLogin: (token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/v1/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pin }),
            });

            if (!response.ok) {
                throw new Error('Invalid PIN');
            }

            const data = await response.json();
            onLogin(data.access_token);
        } catch (err) {
            setError('Access Denied');
            setPin('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column'
        }}>
            <div className="glass-panel" style={{ padding: '3rem', width: '300px', textAlign: 'center' }}>
                <h2 style={{ marginBottom: '2rem', color: 'var(--neon-cyan)' }}>ACCESS CONTROL</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        maxLength={8}
                        className="input-glass"
                        placeholder="ENTER PIN"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        disabled={loading}
                    />
                    {error && <p style={{ color: '#ff4444', marginTop: '1rem' }}>{error}</p>}
                    <button
                        type="submit"
                        className="neon-btn"
                        style={{ marginTop: '2rem', width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? 'VERIFYING...' : 'ENTER SYSTEM'}
                    </button>
                </form>
            </div>
        </div>
    );
};
