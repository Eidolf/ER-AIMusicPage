import React, { useState, useMemo, useRef, useEffect } from 'react';
import { VideoItem } from '../types';
import { ChevronDown, ChevronUp, Download, Music, Search, Edit2, Trash2, Link as LinkIcon, X, Save, Layers, FilterX } from 'lucide-react';

interface VideoGridProps {
    videos: VideoItem[];
    audios: VideoItem[];
    role: string | null;
    onRefresh: () => void;
}

// Internal VideoCard Component to handle refs and playback control
const VideoCard: React.FC<{
    video: VideoItem;
    audios: VideoItem[];
    isPlaying: boolean;
    onPlay: (id: number) => void;
    isAdmin: boolean;
    onEdit: (video: VideoItem) => void;
    onDelete: (id: number) => void;
    // New props for Version Family
    parentVideo?: VideoItem;
    childVideos?: VideoItem[];
    onFilterFamily: (id: number) => void;
}> = ({ video, audios, isPlaying, onPlay, isAdmin, onEdit, onDelete, parentVideo, childVideos, onFilterFamily }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isVersionsExpanded, setIsVersionsExpanded] = useState(false);
    const linkedAudio = audios.find(a => a.related_to_id === video.id);

    // Stop video if not playing
    useEffect(() => {
        if (!isPlaying && videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
        }
    }, [isPlaying]);

    return (
        <div style={{ position: 'relative', height: 'auto', alignSelf: 'start' }}>
            <div className={`glass-panel ${!isPlaying ? 'idle-animate hover-effect' : ''}`}
                style={{
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    height: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    border: (parentVideo || (childVideos && childVideos.length > 0)) ? '1px solid rgba(0, 243, 255, 0.3)' : undefined
                }}
            >
                <div style={{
                    height: '400px',
                    background: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                }}>
                    <video
                        ref={videoRef}
                        src={video.url}
                        controls
                        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                        onPlay={() => onPlay(video.id)}
                    />

                    {/* Admin Controls Overlay */}
                    {isAdmin && (
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            display: 'flex',
                            gap: '5px',
                            zIndex: 10
                        }}>
                            <button onClick={() => onEdit(video)} className="neon-btn" style={{ padding: '5px', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Edit">
                                <Edit2 size={14} />
                            </button>
                            <button onClick={() => onDelete(video.id)} className="neon-btn neon-btn-secondary" style={{ padding: '5px', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title="Delete">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ padding: '1rem', position: 'relative' }}>
                    <div style={{ paddingRight: '2rem' }}>
                        <h3 style={{
                            margin: '0 0 0.5rem 0',
                            whiteSpace: isExpanded ? 'normal' : 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '1.2rem',
                            color: 'var(--neon-cyan)',
                            textShadow: '0 0 5px rgba(0,243,255,0.3)',
                            lineHeight: 1.4
                        }}>
                            {video.title || video.filename}
                        </h3>

                        {video.genre ? (
                            <span style={{
                                display: 'inline-block',
                                padding: '0.3rem 0.8rem',
                                background: 'rgba(255, 0, 255, 0.15)',
                                border: '1px solid rgba(255, 0, 255, 0.3)',
                                borderRadius: '15px',
                                fontSize: '0.8rem',
                                color: '#ff88ff',
                                marginBottom: '0.5rem',
                                fontWeight: 500
                            }}>
                                {video.genre}
                            </span>
                        ) : (
                            <span style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>Unknown Genre</span>
                        )}

                        {/* Version Family Links */}
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {/* Case 1: This is a Child */}
                            {parentVideo && (
                                <div
                                    onClick={() => onFilterFamily(parentVideo.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem',
                                        color: 'var(--neon-purple)', cursor: 'pointer',
                                        background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px'
                                    }}
                                    title="Click to see all versions"
                                >
                                    <LinkIcon size={12} />
                                    <span>Version of: <strong>{parentVideo.title || parentVideo.filename}</strong></span>
                                </div>
                            )}

                            {/* Case 2: This is a Parent */}
                            {childVideos && childVideos.length > 0 && (
                                <div>
                                    <div
                                        onClick={() => setIsVersionsExpanded(!isVersionsExpanded)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem',
                                            color: 'var(--neon-cyan)', cursor: 'pointer',
                                            background: 'rgba(0, 243, 255, 0.1)', padding: '4px 8px', borderRadius: '4px',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Layers size={12} />
                                            <span>{childVideos.length} Alternate Version{childVideos.length !== 1 ? 's' : ''}</span>
                                        </div>
                                        {isVersionsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </div>

                                    {isVersionsExpanded && (
                                        <div style={{
                                            padding: '0.5rem',
                                            background: 'rgba(0,0,0,0.3)',
                                            marginTop: '2px',
                                            borderRadius: '0 0 4px 4px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}>
                                            {childVideos.map(child => (
                                                <div
                                                    key={child.id}
                                                    onClick={() => onFilterFamily(video.id)}
                                                    style={{ fontSize: '0.75rem', color: '#ccc', cursor: 'pointer', padding: '2px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                                >
                                                    ↳ {child.title || child.filename}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{
                            position: 'absolute',
                            top: '1.5rem',
                            right: '1rem',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '50%',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s'
                        }}
                        className="hover-bg-glass"
                    >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>

                    {isExpanded && (
                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', animation: 'fadeIn 0.3s' }}>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#ccc', wordBreak: 'break-all' }}>
                                <strong>File:</strong> {video.filename}
                            </p>

                            <div style={{ display: 'grid', gap: '0.8rem' }}>
                                {linkedAudio && (
                                    <a href={linkedAudio.url} download={linkedAudio.filename} className="neon-btn" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.6rem', background: 'var(--neon-purple)', color: '#fff', textDecoration: 'none' }}>
                                        <Music size={18} /> Download Audio
                                    </a>
                                )}
                                <a href={video.url} download={video.filename} className="neon-btn neon-btn-secondary" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.6rem', textDecoration: 'none' }}>
                                    <Download size={18} /> Download Video
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const VideoGrid: React.FC<VideoGridProps> = ({ videos, audios, role, onRefresh }) => {
    const [playingId, setPlayingId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenre, setSelectedGenre] = useState<string>('All');
    const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
    const [familyFilterId, setFamilyFilterId] = useState<number | null>(null); // To filter by parent ID

    // Edit Form State
    const [editForm, setEditForm] = useState({ title: '', genre: '', related_to_id: '' });

    const isAdmin = role === 'admin';

    // Pre-calculate Relationships (Parent -> Children) using Memo
    const relationships = useMemo(() => {
        const map = new Map<number, VideoItem[]>();
        videos.forEach(v => {
            if (v.related_to_id) {
                if (!map.has(v.related_to_id)) {
                    map.set(v.related_to_id, []);
                }
                map.get(v.related_to_id)?.push(v);
            }
        });
        return map;
    }, [videos]);

    // Unique Genres
    const genres = useMemo(() => {
        const allGenres = videos.map(v => v.genre).filter(Boolean) as string[];
        return ['All', ...Array.from(new Set(allGenres))];
    }, [videos]);

    // Filter Logic
    const filteredVideos = useMemo(() => {
        let result = videos;

        // 1. Family Filter (Highest Priority)
        if (familyFilterId) {
            return result.filter(v => v.id === familyFilterId || v.related_to_id === familyFilterId);
        }

        // 2. Genre Filter
        if (selectedGenre !== 'All') {
            result = result.filter(v => v.genre === selectedGenre);
        }

        // 3. Search Filter
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(v =>
                (v.title && v.title.toLowerCase().includes(lowerQuery)) ||
                v.filename.toLowerCase().includes(lowerQuery)
            );
        }
        return result;
    }, [videos, selectedGenre, searchQuery, familyFilterId]);

    // Handlers
    const handleEdit = (video: VideoItem) => {
        setEditingVideo(video);
        setEditForm({
            title: video.title || '',
            genre: video.genre || '',
            related_to_id: video.related_to_id ? video.related_to_id.toString() : ''
        });
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this media? This cannot be undone.")) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/v1/media/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                onRefresh();
            } else {
                alert("Failed to delete video");
            }
        } catch (e) {
            console.error(e);
            alert("Error deleting video");
        }
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVideo) return;

        const token = localStorage.getItem('token');
        const payload = {
            title: editForm.title,
            genre: editForm.genre,
            related_to_id: editForm.related_to_id ? parseInt(editForm.related_to_id) : null
        };

        try {
            const res = await fetch(`/api/v1/media/${editingVideo.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                onRefresh();
                setEditingVideo(null);
            } else {
                alert("Failed to update video");
            }
        } catch (e) {
            console.error(e);
            alert("Error updating video");
        }
    };

    return (
        <div>
            {/* Controls Bar */}
            <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
                    <input
                        className="input-glass"
                        style={{ paddingLeft: '3rem', textAlign: 'left' }}
                        placeholder="Search videos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Active Filter Indicator */}
                {familyFilterId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', animation: 'fadeIn 0.5s' }}>
                        <span style={{ color: 'var(--neon-purple)', fontWeight: 'bold' }}>
                            Active Filter: version Family #{familyFilterId}
                        </span>
                        <button
                            className="neon-btn neon-btn-secondary"
                            onClick={() => setFamilyFilterId(null)}
                            style={{ padding: '0.4rem 1rem', display: 'flex', gap: '5px', fontSize: '0.8rem' }}
                        >
                            <FilterX size={14} /> Clear Filter
                        </button>
                    </div>
                )}

                {genres.length > 1 && !familyFilterId && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        {genres.map(genre => (
                            <button
                                key={genre}
                                className={`neon-btn ${selectedGenre !== genre ? 'neon-btn-secondary' : ''}`}
                                onClick={() => setSelectedGenre(genre)}
                                style={{
                                    padding: '0.5rem 1.5rem',
                                    minWidth: 'auto',
                                    fontSize: '0.9rem',
                                    opacity: selectedGenre === genre ? 1 : 0.7
                                }}
                            >
                                {genre}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '2rem',
                padding: '1rem'
            }}>
                {filteredVideos.map((video) => {
                    const childVideos = relationships.get(video.id);
                    const parentVideo = video.related_to_id ? videos.find(v => v.id === video.related_to_id) : undefined;

                    return (
                        <VideoCard
                            key={video.id}
                            video={video}
                            audios={audios}
                            isPlaying={playingId === video.id}
                            onPlay={setPlayingId}
                            isAdmin={isAdmin}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            parentVideo={parentVideo}
                            childVideos={childVideos}
                            onFilterFamily={setFamilyFilterId}
                        />
                    );
                })}

                {filteredVideos.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                        No videos found matching your search.
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingVideo && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '500px', maxWidth: '90vw', padding: '2rem', position: 'relative' }}>
                        <button onClick={() => setEditingVideo(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                            <X />
                        </button>
                        <h2 style={{ color: 'var(--neon-cyan)', marginTop: 0 }}>EDIT MEDIA</h2>
                        <form onSubmit={handleSaveEdit} style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Title</label>
                                <input className="input-glass" style={{ textAlign: 'left' }} value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Genre</label>
                                <input className="input-glass" style={{ textAlign: 'left' }} value={editForm.genre} onChange={e => setEditForm({ ...editForm, genre: e.target.value })} list="genre-list" />
                                <datalist id="genre-list">
                                    {genres.filter(g => g !== 'All').map(g => <option key={g} value={g} />)}
                                </datalist>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Link to Version (Parent ID)</label>
                                <select
                                    className="input-glass"
                                    style={{ textAlign: 'left', color: '#fff' }}
                                    value={editForm.related_to_id}
                                    onChange={e => setEditForm({ ...editForm, related_to_id: e.target.value })}
                                >
                                    <option value="" style={{ background: '#050510', color: '#fff' }}>-- None / Is Parent --</option>
                                    {videos
                                        .filter(v => v.id !== editingVideo.id) // Don't link to self
                                        .map(v => (
                                            <option key={v.id} value={v.id} style={{ background: '#050510', color: '#fff' }}>
                                                {v.id}: {v.title || v.filename}
                                            </option>
                                        ))
                                    }
                                </select>
                                <p style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.3rem' }}>
                                    Select another video to group this one with it.
                                </p>
                            </div>
                            <button type="submit" className="neon-btn" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                <Save size={18} /> SAVE CHANGES
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .hover-bg-glass:hover {
                    background: rgba(255,255,255,0.2) !important;
                }
            `}</style>
        </div>
    );
};
