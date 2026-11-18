import { RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react';

const EVENT_LIMIT = 200;
const MEDIA_EVENTS = ['loadstart', 'emptied', 'play', 'playing', 'pause', 'waiting', 'stalled',
    'suspend', 'abort', 'canplay', 'canplaythrough', 'error'];
const DOCUMENT_EVENTS = ['visibilitychange', 'freeze', 'resume'];
type Details = Record<string, string | number | boolean | null>;

interface PlayerSnapshot {
    trackId: number | null;
    trackIndex: number;
    trackCount: number;
    isPlaying: boolean;
    repeatMode: string;
    mix: boolean;
    shouldPause: boolean;
}

export function usePlayerDiagnostics(
    audioRef: RefObject<HTMLAudioElement>,
    intentRef: RefObject<boolean>,
    sourceRef: RefObject<{ id: number }>,
    { trackId, trackIndex, trackCount, isPlaying, repeatMode, mix, shouldPause }: PlayerSnapshot,
) {
    const [status, setStatus] = useState<'off' | 'recording' | 'stopped'>('off');
    const recording = useRef(false);
    const sequence = useRef(0);
    const snapshot = useRef<PlayerSnapshot>({ trackId, trackIndex, trackCount, isPlaying, repeatMode, mix, shouldPause });

    const capture = useCallback((event: string, details?: Details) => {
        const audio = audioRef.current;
        return {
            sequence: ++sequence.current,
            timestamp: new Date().toISOString(),
            monotonicMs: performance.now(),
            event,
            ...snapshot.current,
            audioTrackId: audio ? (sourceRef.current?.id ?? null) : null,
            intendToPlay: intentRef.current,
            paused: audio?.paused ?? null,
            ended: audio?.ended ?? null,
            currentTime: audio?.currentTime ?? null,
            duration: audio?.duration ?? null,
            readyState: audio?.readyState ?? null,
            networkState: audio?.networkState ?? null,
            mediaErrorCode: audio?.error?.code ?? null,
            visibilityState: document.visibilityState,
            hidden: document.hidden,
            details,
        };
    }, [audioRef, intentRef, sourceRef]);

    const events = useRef<ReturnType<typeof capture>[]>([]);
    const record = useCallback((event: string, details?: Details) => {
        if (!recording.current) return;
        const entry = capture(event, details);
        const entries = events.current;
        if (entries.length === EVENT_LIMIT) entries.shift();
        entries.push(entry);
        return entry.sequence;
    }, [capture]);

    useLayoutEffect(() => {
        snapshot.current = { trackId, trackIndex, trackCount, isPlaying, repeatMode, mix, shouldPause };
        record('player-state');
    }, [record, trackId, trackIndex, trackCount, isPlaying, repeatMode, mix, shouldPause]);

    const hasTrack = trackId !== null;
    useLayoutEffect(() => {
        if (status !== 'recording') return;
        const audio = audioRef.current;
        const observe = (event: Event) => { record(event.type); };
        const observePage = (event: PageTransitionEvent) => { record(event.type, { persisted: event.persisted }); };
        // Capture before the existing handlers can change the source or request playback.
        for (const event of MEDIA_EVENTS) audio?.addEventListener(event, observe, true);
        for (const event of DOCUMENT_EVENTS) document.addEventListener(event, observe, true);
        window.addEventListener('pagehide', observePage, true);
        window.addEventListener('pageshow', observePage, true);
        return () => {
            for (const event of MEDIA_EVENTS) audio?.removeEventListener(event, observe, true);
            for (const event of DOCUMENT_EVENTS) document.removeEventListener(event, observe, true);
            window.removeEventListener('pagehide', observePage, true);
            window.removeEventListener('pageshow', observePage, true);
        };
    }, [audioRef, hasTrack, record, status]);

    const toggleRecording = () => {
        if (recording.current) {
            record('recording-stopped');
            recording.current = false;
            setStatus('stopped');
        } else {
            recording.current = true;
            record('recording-started');
            setStatus('recording');
        }
    };

    const exportEvents = () => {
        const exportedAt = new Date().toISOString();
        const blob = new Blob([JSON.stringify({
            version: 1,
            exportedAt,
            discardedEvents: sequence.current - events.current.length,
            events: events.current,
        }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `player-diagnostics-${exportedAt.replace(/[:.]/g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return { status, record, toggleRecording, exportEvents };
}
