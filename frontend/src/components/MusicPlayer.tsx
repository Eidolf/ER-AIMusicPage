import React, { useState, useRef, useEffect } from 'react';
import { VideoItem } from '../types';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2, Minimize2, ListMusic } from 'lucide-react';

interface MusicPlayerProps {
    audios: VideoItem[];
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ audios }) => {
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isExpanded, setIsExpanded] = useState(false);

    const audioRef = useRef<HTMLAudioElement>(null);

    const hasAudio = audios && audios.length > 0;
    const currentTrack = hasAudio ? audios[currentTrackIndex] : null;

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
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

    // Auto-play when track changes if already playing
    useEffect(() => {
        if (audioRef.current && currentTrack) {
            audioRef.current.src = currentTrack.url;
            if (isPlaying) {
                audioRef.current.play().catch(e => console.error("Playback failed", e));
            }
        }
    }, [currentTrackIndex, currentTrack?.url, isPlaying]);

    // If no audios or track, don't render UI
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
                onTimeUpdate={() => { /* Could add progress bar later */ }}
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
                            onClick={() => { setCurrentTrackIndex(index); setIsPlaying(true); }}
                            style={{
                                padding: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                cursor: 'pointer',
                                background: index === currentTrackIndex ? 'rgba(0, 243, 255, 0.1)' : 'transparent',
                                borderRadius: '4px',
                                color: index === currentTrackIndex ? 'var(--neon-cyan)' : '#ccc'
                            }}
                            className="playlist-item"
                        >
                            <span style={{ width: '20px', fontSize: '0.8rem', opacity: 0.5 }}>{index + 1}</span>
                            <span>{track.title || track.filename}</span>
                        </div>
                    ))}
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
