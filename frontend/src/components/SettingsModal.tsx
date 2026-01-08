import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SettingsData {
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    smtp_tls: boolean;
    sender_email: string;
    sender_name: string;
    admin_pin?: string;
    domain?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState<SettingsData>({
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_password: '',
        smtp_tls: true,
        sender_email: '',
        sender_name: 'ER Music Vault',
        domain: ''
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSettings();
        }
    }, [isOpen]);

    const fetchSettings = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/v1/settings/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Merge with defaults if some fields are missing/null
                setFormData(prev => ({ ...prev, ...data }));
            }
        } catch (e) {
            console.error("Failed to fetch settings", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('/api/v1/settings/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                alert("Settings saved successfully!");
                onClose();
            } else {
                alert("Failed to save settings");
            }
        } catch (e) {
            console.error(e);
            alert("Error saving settings");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="glass-panel" style={{ width: '500px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                >
                    <X />
                </button>

                <h2 style={{ color: 'var(--neon-cyan)', marginTop: 0, marginBottom: '2rem' }}>SYSTEM SETTINGS</h2>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
                ) : (
                    <form onSubmit={handleSave} style={{ display: 'grid', gap: '1rem' }}>

                        <h4 style={{ margin: '0', color: 'var(--text-secondary)' }}>General Settings</h4>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Site URL / Domain (for Email Links)</label>
                            <input
                                className="input-glass"
                                style={{ textAlign: 'left', fontSize: '1rem' }}
                                value={formData.domain || ''}
                                onChange={e => setFormData({ ...formData, domain: e.target.value })}
                                placeholder="e.g. music.example.com"
                            />
                        </div>

                        <h4 style={{ margin: '1rem 0 0', color: 'var(--text-secondary)' }}>SMTP Configuration</h4>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>SMTP Host</label>
                            <input
                                className="input-glass"
                                style={{ textAlign: 'left', fontSize: '1rem' }}
                                value={formData.smtp_host || ''}
                                onChange={e => setFormData({ ...formData, smtp_host: e.target.value })}
                                placeholder="e.g. smtp.gmail.com"
                            />
                        </div>

                        <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Port</label>
                                <input
                                    type="number"
                                    className="input-glass"
                                    style={{ textAlign: 'left', fontSize: '1rem' }}
                                    value={formData.smtp_port}
                                    onChange={e => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.smtp_tls}
                                        onChange={e => setFormData({ ...formData, smtp_tls: e.target.checked })}
                                        style={{ accentColor: 'var(--neon-cyan)', width: '1.2rem', height: '1.2rem' }}
                                    />
                                    Use TLS
                                </label>
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Username</label>
                            <input
                                className="input-glass"
                                style={{ textAlign: 'left', fontSize: '1rem' }}
                                value={formData.smtp_user || ''}
                                onChange={e => setFormData({ ...formData, smtp_user: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Password</label>
                            <input
                                type="password"
                                className="input-glass"
                                style={{ textAlign: 'left', fontSize: '1rem' }}
                                value={formData.smtp_password || ''}
                                onChange={e => setFormData({ ...formData, smtp_password: e.target.value })}
                                placeholder="••••••••"
                            />
                        </div>

                        <h4 style={{ margin: '1rem 0 0', color: 'var(--text-secondary)' }}>Sender Info</h4>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Sender Name</label>
                            <input
                                className="input-glass"
                                style={{ textAlign: 'left', fontSize: '1rem' }}
                                value={formData.sender_name || ''}
                                onChange={e => setFormData({ ...formData, sender_name: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Sender Email</label>
                            <input
                                className="input-glass"
                                style={{ textAlign: 'left', fontSize: '1rem' }}
                                value={formData.sender_email || ''}
                                onChange={e => setFormData({ ...formData, sender_email: e.target.value })}
                            />
                        </div>

                        <h4 style={{ margin: '1rem 0 0', color: 'var(--neon-purple)' }}>Security</h4>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Change Admin PIN</label>
                            <input
                                type="text"
                                className="input-glass"
                                style={{ textAlign: 'left', fontSize: '1rem', color: 'var(--neon-cyan)' }}
                                placeholder="Leave empty to keep current"
                                value={formData.admin_pin || ''}
                                onChange={e => setFormData({ ...formData, admin_pin: e.target.value })}
                                maxLength={8}
                            />
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                                Default is set in configuration. Enter a new value via ENV or here to override it.
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="neon-btn"
                            style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                            disabled={saving}
                        >
                            <Save size={18} />
                            {saving ? 'SAVING...' : 'SAVE SETTINGS'}
                        </button>
                    </form>
                )}
            </div>
            <style>{`
                .form-group input:focus {
                    border-color: var(--neon-cyan);
                    box-shadow: 0 0 10px rgba(0,243,255,0.2);
                }
            `}</style>
        </div>
    );
};
