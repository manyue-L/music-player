import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import Visualizer3D from './components/Visualizer3D';
import { Header, MusicPlayer, ControlPanel, Clock } from './components/UI';
import { ShapeType, VisualizerConfig, Song } from './types';
import { generateSeed } from './utils/math';
import { saveSongToDB, getAllSongsFromDB, deleteSongFromDB } from './utils/db';

// Default Color Themes
const THEMES = [
  ['#00ffff', '#ff00ff'], // Cyan Magenta
  ['#ff4d4d', '#ff9f43'], // Fiery
  ['#7efff5', '#7158e2'], // Ice Spirit
  ['#32ff7e', '#fff200'], // Toxic Green
  ['#18dcff', '#3d3d3d'], // Tron
];

const App: React.FC = () => {
  // --- Audio State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [volume, setVolume] = useState(0.7);

  // --- Visualizer Config ---
  const [config, setConfig] = useState<VisualizerConfig>({
    particleCount: 8000,
    particleSize: 0.15,
    speed: 1,
    bloomStrength: 1.5,
    shape: ShapeType.GALAXY,
    colorTheme: THEMES[0],
    sensitivity: 2.5
  });

  // --- Refs ---
  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // --- Initialization ---
  useEffect(() => {
    audioRef.current.crossOrigin = "anonymous";
    loadLibrary();
  }, []);

  // Load songs from IndexedDB
  const loadLibrary = async () => {
    try {
      const storedSongs = await getAllSongsFromDB();
      const songs: Song[] = storedSongs.map(s => ({
        id: s.id,
        name: s.name,
        file: s.blob,
        url: URL.createObjectURL(s.blob),
        uniqueId: generateSeed(s.name)
      }));
      setPlaylist(songs);
      if (songs.length > 0 && !currentSong) {
          // Optional: Don't auto-play, just have them ready
      }
    } catch (e) {
      console.error("Failed to load library", e);
    }
  };

  // --- Audio Handling ---
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512; // 256 frequency bins
      analyser.smoothingTimeConstant = 0.8;
      
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newSongs: Song[] = [];
      
      for (const file of Array.from(files) as File[]) {
          try {
             // Save to DB first
             const stored = await saveSongToDB(file);
             newSongs.push({
                 id: stored.id,
                 name: stored.name,
                 file: stored.blob,
                 url: URL.createObjectURL(stored.blob),
                 uniqueId: generateSeed(stored.name)
             });
          } catch (err) {
              console.error("Error saving song", file.name, err);
          }
      }

      setPlaylist(prev => {
          const updated = [...prev, ...newSongs];
          // If no song playing, prepare the first new one
          if (!currentSong && newSongs.length > 0) {
             // We don't auto-play immediately to allow user to choose, 
             // but we can set it if we want. Let's just update list.
             changeSong(newSongs[0]); 
          }
          return updated;
      });
    }
    // IMPORTANT: Reset the input value so the same file can be selected again
    e.target.value = '';
  };

  const handleDeleteSong = async (id: string) => {
      try {
          await deleteSongFromDB(id);
          // Cleanup URL to avoid memory leak
          const songToDelete = playlist.find(s => s.id === id);
          if (songToDelete) {
              URL.revokeObjectURL(songToDelete.url);
          }
          
          setPlaylist(prev => prev.filter(s => s.id !== id));
          
          // If deleted currently playing song
          if (currentSong?.id === id) {
              handlePause();
              setCurrentSong(null);
              audioRef.current.src = "";
          }
      } catch (err) {
          console.error("Failed to delete song", err);
      }
  };

  const changeSong = (song: Song) => {
    setCurrentSong(song);
    audioRef.current.src = song.url;
    audioRef.current.load();
    
    // Generate unique visuals based on song ID
    // 1. Pick a shape
    const shapes = Object.values(ShapeType);
    const shapeIndex = song.uniqueId % shapes.length;
    
    // 2. Pick a theme
    const themeIndex = song.uniqueId % THEMES.length;

    setConfig(prev => ({
      ...prev,
      shape: shapes[shapeIndex],
      colorTheme: THEMES[themeIndex]
    }));

    handlePlay();
  };

  const handlePlay = () => {
    initAudioContext();
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handlePause = () => {
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (isPlaying) handlePause();
    else handlePlay();
  };

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
      // Revoke all URLs
      playlist.forEach(s => URL.revokeObjectURL(s.url));
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 45], fov: 60 }} gl={{ antialias: false, alpha: false }}>
          <color attach="background" args={['#020205']} />
          <ambientLight intensity={0.5} />
          <Visualizer3D 
            analyser={analyserRef.current} 
            config={config} 
            isPlaying={isPlaying} 
          />
          <OrbitControls 
            enablePan={false} 
            enableZoom={true} 
            minDistance={5} 
            maxDistance={100} 
            autoRotate={isPlaying}
            autoRotateSpeed={0.5}
            enableDamping
          />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <Header />
      
      <MusicPlayer 
        currentSong={currentSong}
        isPlaying={isPlaying}
        onPlayPause={togglePlayPause}
        audioRef={audioRef}
        volume={volume}
        setVolume={setVolume}
        playlist={playlist}
        setSong={changeSong}
      />

      <Clock />

      <ControlPanel 
        config={config} 
        setConfig={setConfig} 
        onUpload={handleFileUpload}
        playlist={playlist}
        setSong={changeSong}
        deleteSong={handleDeleteSong}
        currentSong={currentSong}
      />
      
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-white/10 rounded-tl-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-white/10 rounded-br-3xl pointer-events-none" />
    </div>
  );
};

export default App;