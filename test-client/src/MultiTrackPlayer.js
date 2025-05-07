import React, { useState, useEffect, useRef } from 'react';

// Replace the component implementation to use Web Audio API for precise sync
function MultiTrackPlayer() {
  const [tracks, setTracks] = useState([]);
  const [audioBuffers, setAudioBuffers] = useState([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [mutedStates, setMutedStates] = useState([]);
  const [playing, setPlaying] = useState(false);
  const audioContextRef = useRef(null);
  const sourcesRef = useRef([]);
  const gainNodesRef = useRef([]);
  const [seekOffset, setSeekOffset] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playbackStartTimeRef = useRef(0);
  const songDir = 'HumanRadio_YouMeAndTheRadio_Full';

  // Fetch available tracks from backend
  useEffect(() => {
    fetch('/list-audio/' + songDir)
      .then(res => res.json())
      .then(data => setTracks(data))
      .catch(err => console.error('Failed to fetch tracks:', err));
  }, []);

  // Preload and decode all tracks into AudioBuffers
  useEffect(() => {
    if (tracks.length > 0) {
      setLoadedCount(0);
      setMutedStates(Array(tracks.length).fill(false));
      setAudioBuffers(Array(tracks.length).fill(null));
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      let count = 0;
      tracks.forEach((track, idx) => {
        fetch(`/song/${encodeURIComponent(songDir + '/' + track)}`)
          .then(res => res.arrayBuffer())
          .then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
          .then(buffer => {
            setDuration(prev => Math.max(prev, buffer.duration));
            setAudioBuffers(prev => {
              const newArr = [...prev];
              newArr[idx] = buffer;
              return newArr;
            });
            count += 1;
            setLoadedCount(count);
          })
          .catch(err => console.error('Error decoding track', track, err));
      });
    }
  }, [tracks]);

  // Track play progress and update playbackTime
  useEffect(() => {
    let rafId;
    const updateProgress = () => {
      const ctx = audioContextRef.current;
      if (playing && ctx) {
        const elapsed = ctx.currentTime - playbackStartTimeRef.current + seekOffset;
        if (elapsed >= duration) {
          setPlaybackTime(duration);
          setPlaying(false);
        } else {
          setPlaybackTime(elapsed);
          rafId = requestAnimationFrame(updateProgress);
        }
      }
    };
    if (playing) {
      rafId = requestAnimationFrame(updateProgress);
    }
    return () => cancelAnimationFrame(rafId);
  }, [playing, duration, seekOffset]);

  const handlePlayAll = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    // schedule all buffers to start in sync slightly in future at seekOffset
    const startTime = ctx.currentTime + 0.1;
    playbackStartTimeRef.current = startTime;
    const offset = seekOffset;
    sourcesRef.current = audioBuffers.map((buffer, idx) => {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = mutedStates[idx] ? 0 : 1;
      source.connect(gainNode).connect(ctx.destination);
      source.start(startTime, offset);
      gainNodesRef.current[idx] = gainNode;
      return source;
    });
    setPlaybackTime(seekOffset);
    setPlaying(true);
  };

  const handleStopAll = () => {
    sourcesRef.current.forEach(src => {
      try { src.stop(); } catch (e) {}
    });
    setPlaying(false);
  };

  const toggleMute = idx => {
    setMutedStates(prev => {
      const newStates = [...prev];
      newStates[idx] = !newStates[idx];
      const gainNode = gainNodesRef.current[idx];
      if (gainNode) gainNode.gain.value = newStates[idx] ? 0 : 1;
      return newStates;
    });
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Multi-Track Player</h2>
      {tracks.length === 0 && <p>Loading track list...</p>}
      {tracks.length > 0 && (
        <div>
          <p>Loaded {loadedCount}/{tracks.length} tracks</p>
          <button onClick={playing ? handleStopAll : handlePlayAll} disabled={loadedCount < tracks.length}>
            {playing ? 'Stop All' : 'Play All'}
          </button>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={playbackTime}
            onChange={e => {
              const newTime = parseFloat(e.target.value);
              setSeekOffset(newTime);
              setPlaybackTime(newTime);
              if (playing) {
                handleStopAll();
                setTimeout(handlePlayAll, 0);
              }
            }}
            disabled={duration === 0}
            style={{ marginLeft: '1rem', width: '300px' }}
          />
          <span style={{ marginLeft: '0.5rem' }}>
            {`${Math.floor(playbackTime/60)}:${Math.floor(playbackTime % 60).toString().padStart(2, '0')}`} / {`${Math.floor(duration/60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}`}
          </span>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {tracks.map((track, idx) => (
              <li key={track} style={{ margin: '0.5rem 0' }}>
                {track}
                <button onClick={() => toggleMute(idx)} style={{ marginLeft: '1rem' }}>
                  {mutedStates[idx] ? 'Unmute' : 'Mute'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default MultiTrackPlayer; 