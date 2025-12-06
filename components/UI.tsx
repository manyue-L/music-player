import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Settings, Minimize2, Maximize2, Upload, Music, Clock as ClockIcon, ZoomIn, ZoomOut, Trash2, FolderOpen } from 'lucide-react';
import { ShapeType, VisualizerConfig, Song } from '../types';

// --- Header Component ---
export const Header = () => {
  const textRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (textRef.current) {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        // Map mouse position to hues
        const hue1 = Math.floor(x * 360);
        const hue2 = Math.floor(y * 360);
        textRef.current.style.backgroundImage = `linear-gradient(to right, hsl(${hue1}, 100%, 70%), hsl(${hue2}, 100%, 70%))`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="absolute top-0 left-0 w-full flex justify-center pt-6 z-40 pointer-events-none">
      <h1 
        ref={textRef}
        className="text-5xl font-black tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 transition-colors duration-100 font-['Orbitron'] drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] pointer-events-auto select-none"
      >
        DAVID MUSIC
      </h1>
    </div>
  );
};

// --- Clock Component ---
export const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute bottom-6 left-8 z-40 flex items-center gap-3 text-cyan-500 font-mono text-xl tracking-widest backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10 bg-black/30">
        <ClockIcon size={18} />
        <span>
          {time.toLocaleTimeString([], { hour12: false })}
        </span>
    </div>
  );
};

// --- Music Player Component ---
interface PlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  volume: number;
  setVolume: (v: number) => void;
  playlist: Song[];
  setSong: (s: Song) => void;
}

export const MusicPlayer: React.FC<PlayerProps> = ({ 
  currentSong, isPlaying, onPlayPause, audioRef, volume, setVolume, playlist, setSong 
}) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [audioRef, currentSong]);

  const formatTime = (t: number) => {
    if (isNaN(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Number(e.target.value);
      setProgress(Number(e.target.value));
    }
  };

  return (
    <div className="absolute top-6 left-8 w-80 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 z-50 shadow-2xl shadow-purple-900/20">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg animate-pulse">
          <Music size={24} className="text-white" />
        </div>
        <div className="overflow-hidden">
          <h3 className="text-white font-bold text-lg truncate font-['Rajdhani']">
            {currentSong ? currentSong.name : "No Track Selected"}
          </h3>
          <p className="text-gray-400 text-xs uppercase tracking-wider">Visual Audio Engine</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 text-xs text-gray-400 font-mono">
        <span>{formatTime(progress)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      <input 
        type="range" 
        min="0" 
        max={duration || 100} 
        value={progress} 
        onChange={handleSeek}
        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer mb-4 accent-cyan-400 hover:accent-cyan-300"
      />

      <div className="flex items-center justify-between">
        <button className="text-gray-400 hover:text-white transition-colors" title="Previous (Mock)">
          <SkipBack size={20} />
        </button>
        
        <button 
          onClick={onPlayPause}
          className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.4)]"
        >
          {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1"/>}
        </button>

        <button className="text-gray-400 hover:text-white transition-colors" title="Next (Mock)">
          <SkipForward size={20} />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
        <Volume2 size={16} className="text-gray-400" />
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full h-1 bg-gray-700 rounded-lg accent-purple-400"
        />
      </div>
    </div>
  );
};

// --- Control Panel Component ---
interface PanelProps {
  config: VisualizerConfig;
  setConfig: React.Dispatch<React.SetStateAction<VisualizerConfig>>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  playlist: Song[];
  setSong: (s: Song) => void;
  deleteSong: (id: string) => void;
  currentSong: Song | null;
}

export const ControlPanel: React.FC<PanelProps> = ({ 
  config, setConfig, onUpload, playlist, setSong, deleteSong, currentSong 
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [scale, setScale] = useState(1);

  const togglePanel = () => setIsMinimized(!isMinimized);
  const zoomIn = () => setScale(s => Math.min(s + 0.1, 1.5));
  const zoomOut = () => setScale(s => Math.max(s - 0.1, 0.5));

  if (isMinimized) {
    return (
      <button 
        onClick={togglePanel}
        className="absolute top-6 right-8 w-12 h-12 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center z-50 hover:bg-white/10 transition-colors"
      >
        <Settings size={20} className="text-white" />
      </button>
    );
  }

  return (
    <div 
        className="absolute top-6 right-8 z-50 transition-all origin-top-right"
        style={{ transform: `scale(${scale})` }}
    >
      <div className="w-80 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-cyan-400">
            <Settings size={18} />
            <h2 className="font-bold tracking-widest text-sm uppercase">Control Node</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={zoomOut} className="p-1 hover:bg-white/10 rounded" title="Zoom Out UI">
                <ZoomOut size={14} className="text-gray-400" />
            </button>
            <span className="text-xs text-gray-500 font-mono w-8 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn} className="p-1 hover:bg-white/10 rounded" title="Zoom In UI">
                <ZoomIn size={14} className="text-gray-400" />
            </button>
            <div className="w-px h-4 bg-gray-700 mx-1"></div>
            <button onClick={togglePanel} className="text-gray-400 hover:text-white">
                <Minimize2 size={18} />
            </button>
          </div>
        </div>

        {/* Shapes */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Geometry Core</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(ShapeType).map((shape) => (
              <button
                key={shape}
                onClick={() => setConfig(prev => ({ ...prev, shape }))}
                className={`text-xs p-2 rounded border transition-all ${
                  config.shape === shape 
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' 
                    : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                }`}
              >
                {shape}
              </button>
            ))}
          </div>
        </div>

        {/* Parameters */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Particle Count</span>
              <span>{config.particleCount}</span>
            </label>
            <input 
              type="range" min="1000" max="20000" step="1000"
              value={config.particleCount}
              onChange={(e) => setConfig(prev => ({ ...prev, particleCount: Number(e.target.value) }))}
              className="w-full h-1 bg-gray-700 accent-cyan-500 rounded-lg"
            />
          </div>
          <div>
            <label className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Bloom Intensity</span>
              <span>{config.bloomStrength}</span>
            </label>
            <input 
              type="range" min="0" max="3" step="0.1"
              value={config.bloomStrength}
              onChange={(e) => setConfig(prev => ({ ...prev, bloomStrength: Number(e.target.value) }))}
              className="w-full h-1 bg-gray-700 accent-purple-500 rounded-lg"
            />
          </div>
          <div>
            <label className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Audio Sensitivity</span>
              <span>{config.sensitivity}</span>
            </label>
            <input 
              type="range" min="0" max="5" step="0.1"
              value={config.sensitivity}
              onChange={(e) => setConfig(prev => ({ ...prev, sensitivity: Number(e.target.value) }))}
              className="w-full h-1 bg-gray-700 accent-pink-500 rounded-lg"
            />
          </div>
        </div>

        {/* Upload & Playlist */}
        <div className="pt-4 border-t border-white/10">
          <label className="flex items-center justify-center gap-2 w-full p-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg cursor-pointer hover:opacity-90 transition-opacity mb-4 shadow-lg group">
            <Upload size={16} className="group-hover:scale-110 transition-transform"/>
            <span className="text-sm font-bold">Import Audio</span>
            <input type="file" multiple accept="audio/*" onChange={onUpload} className="hidden" />
          </label>
          
          <div className="flex items-center gap-2 mb-2 text-cyan-400 opacity-80">
            <FolderOpen size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">Local Library</span>
          </div>

          <div className="bg-black/40 rounded-lg border border-white/5 overflow-hidden">
            {playlist.length > 0 ? (
              <div className="max-h-48 overflow-y-auto">
                {playlist.map(s => (
                  <div 
                      key={s.id} 
                      className={`group flex items-center justify-between text-xs p-3 cursor-pointer transition-colors border-b border-white/5 last:border-0 ${
                        currentSong?.id === s.id 
                          ? 'bg-white/10 text-cyan-300' 
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                  >
                    <div className="flex-1 truncate pr-2" onClick={() => setSong(s)}>
                        {s.name}
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); deleteSong(s.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
                        title="Delete from Library"
                    >
                        <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
                <div className="p-4 text-center text-xs text-gray-600 italic">
                    Library is empty.<br/>Upload songs to save them here.
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};