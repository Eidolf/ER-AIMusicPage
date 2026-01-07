import React, { useState, useMemo } from 'react';
import { VideoItem } from '../types';
import { ChevronDown, ChevronUp, Download, Music } from 'lucide-react';

interface VideoGridProps {
    videos: VideoItem[];
    audios: VideoItem[];
}

export const VideoGrid: React.FC<VideoGridProps> = ({ videos, audios }) => {
    const [playingId, setPlayingId] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [selectedGenre, setSelectedGenre] = useState<string>('All');

    // Extract unique genres
    const genres = useMemo(() => {
        const allGenres = videos.map(v => v.genre).filter(Boolean) as string[];
        return ['All', ...Array.from(new Set(allGenres))];
    }, [videos]);

    // Filter videos
    const filteredVideos = useMemo(() => {
        if (selectedGenre === 'All') return videos;
        return videos.filter(v => v.genre === selectedGenre);
    }, [videos, selectedGenre]);

    // Generate random delays for each video once
    const randomDelays = useMemo(() => {
        return videos.map(() => Math.random() * 5 + 's');
    }, [videos]);

    const toggleExpand = (id: number) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div>
            {/* Genre Filter */}
            {genres.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', padding: '1rem', flexWrap: 'wrap' }}>
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

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', // Narrower cards as requested
                gap: '2rem',
                padding: '2rem'
            }}>
                {filteredVideos.map((video) => {
                    const isPlaying = playingId === video.id;
                    const isExpanded = expandedId === video.id;

                    // Match associated audio
                    const linkedAudio = audios.find(a => a.related_to_id === video.id);

                    // Helper to get original index for correct animation delay matching
                    const originalIndex = videos.findIndex(v => v.id === video.id);

                    return (
                        <div
                            key={video.id}
                            style={{
                                position: 'relative',
                                // Allow container to grow, but keep grid layout stable
                                height: 'auto',
                                alignSelf: 'start'
                            }}
                        >
                            <div
                                className={`glass-panel ${!isPlaying ? 'idle-animate hover-effect' : ''}`}
                                style={{
                                    overflow: 'hidden',
                                    animationDelay: randomDelays[originalIndex] || '0s',
                                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                                    height: 'auto', // Let content dictate height
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                <div style={{
                                    // Make video container flexible or taller if needed, but 9:16 usually means tall.
                                    // User said "Video is 9:16", maybe we should make the container taller 
                                    // to respect that or just let it fit.
                                    // Let's stick to a reasonable height but ensure fit.
                                    height: '400px', // Taller for vertical videos
                                    background: '#000',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative'
                                }}>
                                    <video
                                        src={video.url}
                                        controls
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'contain', // Keep aspect ratio
                                            background: '#000'
                                        }}
                                        onPlay={() => setPlayingId(video.id)}
                                        onPause={() => setPlayingId(null)}
                                        onEnded={() => setPlayingId(null)}
                                    />
                                </div>

                                <div style={{
                                    padding: '1rem', // Reduced padding
                                    position: 'relative',
                                    // Removed flex: 1 to prevent stretching
                                }}>
                                    {/* Main Info */}
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
                                            <span style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
                                                Unknown Genre
                                            </span>
                                        )}
                                    </div>

                                    {/* Toggle Button */}
                                    <button
                                        onClick={() => toggleExpand(video.id)}
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

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', animation: 'fadeIn 0.3s' }}>
                                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#ccc', wordBreak: 'break-all' }}>
                                                <strong>File:</strong> {video.filename}
                                            </p>

                                            <div style={{ display: 'grid', gap: '0.8rem' }}>
                                                {/* Audio Download */}
                                                {linkedAudio && (
                                                    <a
                                                        href={linkedAudio.url}
                                                        download={linkedAudio.filename}
                                                        className="neon-btn"
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '0.5rem',
                                                            fontSize: '0.9rem',
                                                            padding: '0.6rem',
                                                            background: 'var(--neon-purple)',
                                                            color: '#fff',
                                                            textDecoration: 'none'
                                                        }}
                                                    >
                                                        <Music size={18} />
                                                        Download Audio ({linkedAudio.filename.split('.').pop()?.toUpperCase()})
                                                    </a>
                                                )}

                                                {/* Video Download */}
                                                <a
                                                    href={video.url}
                                                    download={video.filename}
                                                    className="neon-btn neon-btn-secondary"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '0.5rem',
                                                        fontSize: '0.9rem',
                                                        padding: '0.6rem',
                                                        textDecoration: 'none'
                                                    }}
                                                >
                                                    <Download size={18} />
                                                    Download Video
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredVideos.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                        No videos found{selectedGenre !== 'All' ? ` for genre "${selectedGenre}"` : ''}.
                    </div>
                )}
            </div>

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
