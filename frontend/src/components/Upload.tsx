import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { Upload as UploadIcon } from 'lucide-react';
import { VideoItem } from '../types';

interface UploadProps {
    onUploadSuccess: () => void;
}

export const Upload: React.FC<UploadProps> = ({ onUploadSuccess }) => {
    const fileInput = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [mediaType, setMediaType] = useState<'video' | 'audio'>('video');
    const [relatedToId, setRelatedToId] = useState<string>('');
    const [title, setTitle] = useState('');
    const [genre, setGenre] = useState('');
    const [videos, setVideos] = useState<VideoItem[]>([]);

    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Fetch videos to populate dropdown for Audio linking
    useEffect(() => {
        if (mediaType === 'audio') {
            fetchVideos();
        }
    }, [mediaType]);

    const fetchVideos = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get('/api/v1/media/videos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setVideos(res.data);
        } catch (e) {
            console.error("Failed to fetch videos");
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        const token = localStorage.getItem('token');
        if (!file || !token) return;

        setUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('media_type', mediaType);
        if (title) formData.append('title', title);
        if (genre) formData.append('genre', genre);

        if (mediaType === 'audio' && relatedToId) {
            formData.append('related_to_id', relatedToId);
        }

        try {
            await axios.post('/api/v1/media/upload', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const total = progressEvent.total || file.size;
                    const percent = Math.round((progressEvent.loaded * 100) / total);
                    setUploadProgress(percent);
                }
            });
            // Reset
            setFile(null);
            setTitle('');
            setGenre('');
            setUploadProgress(0);
            setUploading(false);
            if (fileInput.current) fileInput.current.value = '';
            onUploadSuccess();
            alert('Upload successful!');
        } catch (error) {
            console.error(error);
            setUploading(false);
            alert('Upload failed');
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ marginTop: 0, textShadow: '0 0 10px rgba(0,243,255,0.5)' }}>Upload Media</h2>

            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                <button
                    className={`neon-btn ${mediaType !== 'video' ? 'neon-btn-secondary' : ''}`}
                    onClick={() => setMediaType('video')}
                    style={{ flex: 1, background: mediaType === 'video' ? 'var(--neon-cyan)' : 'transparent', color: mediaType === 'video' ? '#000' : 'inherit' }}
                >
                    Video
                </button>
                <button
                    className={`neon-btn ${mediaType !== 'audio' ? 'neon-btn-secondary' : ''}`}
                    onClick={() => setMediaType('audio')}
                    style={{ flex: 1, background: mediaType === 'audio' ? 'var(--neon-purple)' : 'transparent', color: mediaType === 'audio' ? '#fff' : 'inherit' }}
                >
                    Audio / Soundtrack
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <input
                    type="text"
                    placeholder="Title (Optional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-glass"
                    style={{ textAlign: 'left', letterSpacing: '1px' }}
                />
                <input
                    type="text"
                    placeholder="Genre (e.g. Cyberpunk, Synthwave)"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="input-glass"
                    style={{ textAlign: 'left', letterSpacing: '1px' }}
                />
            </div>

            {mediaType === 'audio' && (
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Link to Video (Optional):</label>
                    <select
                        value={relatedToId}
                        onChange={(e) => setRelatedToId(e.target.value)}
                        className="input-glass"
                        style={{ textAlign: 'left', appearance: 'none' }}
                    >
                        <option value="">-- Independent Audio --</option>
                        {videos.map(v => (
                            <option key={v.id} value={v.id}>{v.filename}</option>
                        ))}
                    </select>
                </div>
            )}

            <div style={{
                border: '2px dashed var(--glass-border)',
                borderRadius: '8px',
                padding: '2rem',
                textAlign: 'center',
                marginBottom: '1rem',
                cursor: 'pointer',
                transition: 'border-color 0.3s'
            }}
                onClick={() => fileInput.current?.click()}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--neon-cyan)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
            >
                <input
                    type="file"
                    style={{ display: 'none' }}
                    ref={fileInput}
                    onChange={handleFileSelect}
                    accept={mediaType === 'video' ? "video/*,.mp4" : "audio/*,.mp3,.wav"}
                />

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
                    <UploadIcon size={32} color="var(--neon-cyan)" />
                    <span style={{ fontSize: '1.2rem' }}>
                        {file ? file.name : "Click to select file"}
                    </span>
                </div>
            </div>

            {uploading && (
                <div style={{ marginTop: '1rem' }}>
                    <div style={{
                        height: '4px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '2px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${uploadProgress}%`,
                            background: 'var(--neon-cyan)',
                            transition: 'width 0.2s ease'
                        }} />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--neon-cyan)' }}>
                        {uploadProgress}%
                    </div>
                </div>
            )}

            <button
                className="neon-btn"
                style={{ width: '100%', marginTop: '1rem', opacity: file ? 1 : 0.5, pointerEvents: file ? 'auto' : 'none' }}
                onClick={handleUpload}
            >
                {uploading ? 'Uploading...' : 'Start Upload'}
            </button>
        </div>
    );
};
