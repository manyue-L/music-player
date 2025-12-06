import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

import Visualizer3D from './components/Visualizer3D';
import { Header, MusicPlayer, ControlPanel, Clock } from './components/UI';
import { ShapeType, VisualizerConfig, Song } from './types';
import { generateSeed } from './utils/math';

// 引入新的云端逻辑
import { fetchSongsFromCloud, uploadSongToCloud, deleteSongFromCloud } from './utils/cloud';

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
  const [isUploading, setIsUploading] = useState(false); // 新增上传状态

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
    // 允许跨域播放音频 (关键设置)
    audioRef.current.crossOrigin = "anonymous";
    loadLibrary();
  }, []);

  // 从 Supabase 加载歌曲
  const loadLibrary = async () => {
    try {
      const cloudSongs = await fetchSongsFromCloud();
      
      const songs: Song[] = cloudSongs.map((s: any) => ({
        id: s.id,
        name: s.name,
        // 云端歌曲没有本地 Blob file，所以这里是 undefined
        url: s.url, 
        uniqueId: s.unique_id // 使用数据库里存的种子
      }));

      setPlaylist(songs);
    } catch (e) {
      console.error("Failed to load library from cloud", e);
    }
  };

  // --- Audio Handling ---
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512; 
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

  // 修改后的上传逻辑
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsUploading(true); // 开启加载状态
      
      for (const file of Array.from(files) as File[]) {
          try {
             console.log("Uploading:", file.name);
             await uploadSongToCloud(file);
          } catch (err) {
              console.error("Error uploading song", file.name, err);
              alert(`上传失败: ${file.name}`);
          }
      }
      
      // 上传完成后刷新列表
      await loadLibrary();
      setIsUploading(false);
    }
    e.target.value = '';
  };

  const handleDeleteSong = async (id: string) => {
      try {
          const songToDelete = playlist.find(s => s.id === id);
          if (songToDelete) {
             await deleteSongFromCloud(id, songToDelete.url);
          }
          
          setPlaylist(prev => prev.filter(s => s.id !== id));
          
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
    // 确保 URL 有效
    if (!song.url) return;

    setCurrentSong(song);
    audioRef.current.src = song.url;
    audioRef.current.load();
    
    // Generate visuals
    const shapes = Object.values(ShapeType);
    const shapeIndex = song.uniqueId % shapes.length;
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
      playPromise.then(() => setIsPlaying(true)).catch(err => {
        console.error("Play error:", err);
      });
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

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
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
      
      {/* 显示上传中的状态提示 (可选) */}
      {isUploading && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 px-4 py-2 rounded-full text-white z-50 animate-pulse">
          正在上传到云端...
        </div>
      )}

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
      
      <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-white/10 rounded-tl-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-white/10 rounded-br-3xl pointer-events-none" />
    </div>
  );
};

export default App;