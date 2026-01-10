import React, { useState, useRef, useEffect } from 'react';
import { VideoItem } from '../types';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, Minimize2, ListMusic, Trash2, Link as LinkIcon } from 'lucide-react';
import axios from 'axios';

interface MusicPlayerProps {
    audios: VideoItem[];
    videos: VideoItem[];
    onDelete?: () => void; // Callback to refresh list
    role: string | null;
    shouldPause?: boolean;
    onPlay?: () => void;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ audios: initialAudios, videos, onDelete, role, shouldPause, onPlay }) => {
    // Local state to manage audios if we modify them (delete)
    const [audios, setAudios] = useState<VideoItem[]>(initialAudios);

    useEffect(() => {
        setAudios(initialAudios);
    }, [initialAudios]);

    const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isExpanded, setIsExpanded] = useState(false);

    // Linking Modal State
    const [linkingTrackId, setLinkingTrackId] = useState<number | null>(null);
    const [selectedVideoId, setSelectedVideoId] = useState<string>('');

    // Seekbar state
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const audioRef = useRef<HTMLAudioElement>(null);
    const hasAudio = audios && audios.length > 0;
    const currentTrack = hasAudio ? audios[currentTrackIndex] : null;

    // Check admin role
    const isAdmin = role === 'admin';

    // Pause audio if external signal (shouldPause) is on
    useEffect(() => {
        if (shouldPause && isPlaying) {
            if (audioRef.current) audioRef.current.pause();
            setIsPlaying(false);
        }
    }, [shouldPause, isPlaying]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
                if (onPlay) onPlay(); // Notify parent
            }
            setIsPlaying(!isPlaying);
        }
    };

    const playNext = () => {
        if (!hasAudio) return;
        let nextIndex = currentTrackIndex + 1;
        if (nextIndex >= audios.length) nextIndex = 0;
        setCurrentTrackIndex(nextIndex);
        setIsPlaying(true);
    };

    const playPrev = () => {
        if (!hasAudio) return;
        let prevIndex = currentTrackIndex - 1;
        if (prevIndex < 0) prevIndex = audios.length - 1;
        setCurrentTrackIndex(prevIndex);
        setIsPlaying(true);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVol = parseFloat(e.target.value);
        setVolume(newVol);
        if (audioRef.current) {
            audioRef.current.volume = newVol;
        }
        setIsMuted(newVol === 0);
    };

    const toggleMute = () => {
        if (audioRef.current) {
            const newMuteState = !isMuted;
            setIsMuted(newMuteState);
            audioRef.current.muted = newMuteState;
        }
    };

    // Seekbar handlers
    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const handleDeleteTrack = async (e: React.MouseEvent, trackId: number) => {
        e.stopPropagation(); // Prevent playing when clicking delete
        if (!window.confirm("Delete this track?")) return;

        const token = localStorage.getItem('token');
        try {
            await axios.delete(`/api/v1/media/${trackId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Invoke callback to refresh parent state
            if (onDelete) onDelete();
        } catch (error) {
            console.error("Failed to delete track", error);
            alert("Failed to delete track");
        }
    };

    const openLinkModal = (e: React.MouseEvent, track: VideoItem) => {
        e.stopPropagation();
        setLinkingTrackId(track.id);
        setSelectedVideoId(track.related_to_id ? track.related_to_id.toString() : '');
    };

    const handleSaveLink = async () => {
        if (linkingTrackId === null) return;
        const token = localStorage.getItem('token');

        try {
            await axios.put(`/api/v1/media/${linkingTrackId}`, {
                related_to_id: selectedVideoId ? parseInt(selectedVideoId) : null
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Also trigger re-index to sync genre?
            // User requested explicit "reindex button", but logically if linking, we should probably sync?
            // The prompt "link to video" implies association.
            // I'll stick to just linking for now, but if the backend endpoint `reindex-audio` exists, the user can use that.
            // OR I can manually update genre here too if easier.
            // Let's just update the link. The "Sync Audio Genres" button handles the rest.
            // Actually, for better UX, maybe we should fetch the video genre and update it locally?
            // But let's keep it simple as requested: "directly assign a video".

            setLinkingTrackId(null);
            if (onDelete) onDelete(); // Refresh list
        } catch (e) {
            console.error(e);
            alert("Failed to link video");
        }
    };

    // Auto-play when track changes if already playing
    useEffect(() => {
        if (audioRef.current && currentTrack) {
            audioRef.current.src = currentTrack.url;
            if (isPlaying) {
                audioRef.current.play().catch(e => console.error("Playback failed", e));
            }
        }
    }, [currentTrack, isPlaying]);

    // If no audios, don't render UI
    if (!hasAudio || !currentTrack) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(5, 5, 16, 0.95)',
            borderTop: '1px solid var(--glass-border)',
            backdropFilter: 'blur(10px)',
            padding: '1rem',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -5px 20px rgba(0,0,0,0.5)'
        }}>
            {/* Progress Bar (Full Width Top) */}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '10px', fontSize: '0.8rem', color: '#aaa' }}>
                <span>{formatTime(currentTime)}</span>
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    style={{ flex: 1, accentColor: 'var(--neon-purple)', height: '4px' }}
                />
                <span>{formatTime(duration)}</span>
            </div>

            {/* Main Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>

                {/* Track Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, overflow: 'hidden' }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        background: 'linear-gradient(45deg, var(--neon-purple), var(--neon-cyan))',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <ListMusic color="#fff" />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{
                            color: '#fff',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {currentTrack.title || currentTrack.filename}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            {currentTrack.genre || 'Unknown Genre'}
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1, justifyContent: 'center' }}>
                    <button onClick={playPrev} className="control-btn" title="Previous">
                        <SkipBack size={20} />
                    </button>

                    <button onClick={togglePlay} className="play-btn" title={isPlaying ? "Pause" : "Play"}>
                        {isPlaying ? <Pause fill="#000" size={24} /> : <Play fill="#000" size={24} style={{ marginLeft: '4px' }} />}
                    </button>

                    <button onClick={playNext} className="control-btn" title="Next">
                        <SkipForward size={20} />
                    </button>
                </div>

                {/* Volume & Extras */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, justifyContent: 'flex-end' }}>
                    <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                        {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        style={{ width: '80px', accentColor: 'var(--neon-cyan)' }}
                    />

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: '1rem' }}
                        title="Toggle Playlist"
                    >
                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                </div>
            </div>

            {/* Hidden Audio Element */}
            <audio
                ref={audioRef}
                onEnded={playNext}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleTimeUpdate}
            />

            {/* Expanded Playlist View */}
            {isExpanded && (
                <div style={{
                    marginTop: '1rem',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: '1rem'
                }}>
                    {audios.map((track, index) => (
                        <div
                            key={track.id}
                            onClick={() => { setCurrentTrackIndex(index); setIsPlaying(true); if (onPlay) onPlay(); }}
                            style={{
                                padding: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                cursor: 'pointer',
                                background: index === currentTrackIndex ? 'rgba(0, 243, 255, 0.1)' : 'transparent',
                                borderRadius: '4px',
                                color: index === currentTrackIndex ? 'var(--neon-cyan)' : '#ccc',
                                justifySelf: 'stretch'
                            }}
                            className="playlist-item"
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                <span style={{ width: '20px', fontSize: '0.8rem', opacity: 0.5 }}>{index + 1}</span>
                                <span style={{ flex: 1 }}>{track.title || track.filename}</span>
                                {track.related_to_id && (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--neon-purple)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                        Linked
                                    </span>
                                )}
                            </div>

                            {isAdmin && (
                                <div style={{ display: 'flex', gap: '10px' }} onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={(e) => openLinkModal(e, track)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neon-purple)' }}
                                        title="Link to Video"
                                    >
                                        <LinkIcon size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteTrack(e, track.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d4d' }}
                                        title="Delete Track"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Linking Modal */}
            {linkingTrackId !== null && (
                <div style={{
                    position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.95)', border: '1px solid var(--neon-purple)',
                    padding: '1.5rem', borderRadius: '8px', zIndex: 1100, width: '300px',
                    boxShadow: '0 0 20px rgba(188, 19, 254, 0.3)'
                }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: 'var(--neon-purple)' }}>Link Audio to Video</h4>
                    <select
                        value={selectedVideoId}
                        onChange={(e) => setSelectedVideoId(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '4px', marginBottom: '1rem' }}
                    >
                        <option value="">-- No Link --</option>
                        {videos.map(v => (
                            <option key={v.id} value={v.id}>
                                {v.title || v.filename}
                            </option>
                        ))}
                    </select>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => setLinkingTrackId(null)} className="neon-btn neon-btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Cancel</button>
                        <button onClick={handleSaveLink} className="neon-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: 'var(--neon-purple)', color: '#fff' }}>Save</button>
                    </div>
                </div>
            )}

            <style>{`
                .control-btn {
                    background: none;
                    border: none;
                    color: #fff;
                    cursor: pointer;
                    opacity: 0.8;
                    transition: opacity 0.2s;
                }
                .control-btn:hover {
                    opacity: 1;
                    color: var(--neon-cyan);
                }
                .play-btn {
                    width: 45px;
                    height: 45px;
                    border-radius: 50%;
                    background: var(--neon-cyan);
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 0 10px var(--neon-cyan);
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .play-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 0 20px var(--neon-cyan);
                }
                .playlist-item:hover {
                    background: rgba(255,255,255,0.05);
                }
            `}</style>
        </div>
    );
};
