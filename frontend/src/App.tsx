import { useState, useEffect } from 'react'
import { VideoGrid } from './components/VideoGrid'
import { Login } from './components/Login'
import { Upload } from './components/Upload'
import { GuestManager } from './components/GuestManager'
import { SettingsModal } from './components/SettingsModal'
import { VideoItem } from './types'
import { jwtDecode } from "jwt-decode";
import { LogOut, Settings } from 'lucide-react';
import './styles/index.css'

interface TokenPayload {
    sub: string;
    role: string;
    exp: number;
}

function App() {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [role, setRole] = useState<string | null>(null);
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [audios, setAudios] = useState<VideoItem[]>([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode<TokenPayload>(token);
                setRole(decoded.role);
                fetchMedia();
            } catch (e) {
                handleLogout();
            }
        }
    }, [token]);

    const fetchMedia = async () => {
        const token = localStorage.getItem('token');
        try {
            const [vidRes, audRes] = await Promise.all([
                fetch('/api/v1/media/videos', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/v1/media/audio', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (vidRes.ok) setVideos(await vidRes.json());
            if (audRes.ok) setAudios(await audRes.json());

        } catch (e) {
            console.error("Fetch failed", e);
        }
    };

    const handleLogin = (newToken: string) => {
        setToken(newToken);
        localStorage.setItem('token', newToken);
    };

    const handleLogout = () => {
        setToken(null);
        setRole(null);
        localStorage.removeItem('token');
    }

    if (!token) {
        return <Login onLogin={handleLogin} />
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '3rem',
                borderBottom: '1px solid var(--glass-border)',
                paddingBottom: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img
                        src="/limit_static/logo.png"
                        onError={(e) => e.currentTarget.src = '/logo.png'} // Fallback for dev/prod diffs
                        alt="Logo"
                        style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', letterSpacing: '2px', lineHeight: 1 }}>ER MUSIC</h1>
                        <span style={{ fontSize: '0.8rem', color: 'var(--neon-purple)', letterSpacing: '1px' }}>
                            {role === 'admin' ? 'ADMIN CONSOLE' : 'GUEST ACCESS'}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {role === 'admin' && (
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="neon-btn neon-btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', padding: '0.5rem' }}
                            title="Settings"
                        >
                            <Settings size={20} />
                        </button>
                    )}
                    <button onClick={handleLogout} className="neon-btn neon-btn-secondary" style={{ padding: '0.5rem', display: 'flex' }} title="Logout">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main>
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ color: 'var(--neon-cyan)', marginBottom: '1.5rem' }}>LATEST DROPS</h2>
                    <VideoGrid videos={videos} audios={audios} role={role} onRefresh={fetchMedia} />
                </section>

                {role === 'admin' && (
                    <>
                        <section style={{ marginBottom: '2rem' }}>
                            <Upload onUploadSuccess={fetchMedia} />
                        </section>

                        <section>
                            <GuestManager />
                        </section>

                        <SettingsModal
                            isOpen={isSettingsOpen}
                            onClose={() => setIsSettingsOpen(false)}
                        />
                    </>
                )}
            </main>

            <footer style={{ marginTop: '5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                <p>SECURE MUSIC VAULT // {new Date().getFullYear()}</p>
            </footer>
        </div>
    )
}

export default App
