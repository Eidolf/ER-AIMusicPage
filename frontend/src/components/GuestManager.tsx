import React, { useState, useEffect } from 'react';
import { Guest } from '../types';

export const GuestManager: React.FC = () => {
    const [guests, setGuests] = useState<Guest[]>([]);
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchGuests();
    }, []);

    const fetchGuests = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/v1/guests/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            setGuests(await res.json());
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/v1/guests/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email, name })
            });
            if (res.ok) {
                const newGuest: Guest = await res.json();
                setEmail('');
                setName('');
                fetchGuests();
                // Explicitly show PIN as requested
                alert(`Guest Invited Successfully!\n\nAccess PIN: ${newGuest.pin}\n\n(Please copy this PIN manually if the email fails)`);
            } else {
                const errorData = await res.json();
                alert(`Failed to invite guest: ${errorData.detail || 'Unknown error'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Revoke access for this guest?')) return;
        const token = localStorage.getItem('token');
        await fetch(`/api/v1/guests/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchGuests();
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
            <h3 style={{ color: 'var(--neon-cyan)', margin: '0 0 1.5rem 0' }}>GUEST MANAGEMENT</h3>

            <form onSubmit={handleInvite} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <input
                    className="input-glass"
                    placeholder="Guest Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{ flex: 1, textAlign: 'left', minWidth: '200px' }}
                />
                <input
                    className="input-glass"
                    placeholder="Guest Name (Optional)"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={{ flex: 1, textAlign: 'left', minWidth: '200px' }}
                />
                <button type="submit" className="neon-btn" disabled={loading}>
                    {loading ? 'SENDING...' : 'INVITE'}
                </button>
            </form>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {guests.map(guest => (
                    <div key={guest.id} style={{
                        background: 'rgba(255,255,255,0.03)',
                        padding: '1rem',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        border: '1px solid var(--glass-border)'
                    }}>
                        <div>
                            <div style={{ fontWeight: 600, color: 'white' }}>{guest.name || 'Guest'}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {guest.email} • PIN: <span style={{ color: 'var(--neon-purple)' }}>{guest.pin}</span>
                            </div>
                        </div>
                        <button
                            className="neon-btn neon-btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '0.7rem' }}
                            onClick={() => handleDelete(guest.id)}
                        >
                            REVOKE
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
