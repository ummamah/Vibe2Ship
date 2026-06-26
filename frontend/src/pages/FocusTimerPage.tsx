import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:8000/api/v1/focus';

interface TimerState {
  phase: 'idle' | 'focus' | 'short_break' | 'long_break' | 'paused' | 'completed';
  time_remaining_seconds: number;
  total_seconds: number;
  progress_percentage: number;
  session_number: number;
  topic: string;
  is_active: boolean;
  is_paused: boolean;
}

interface TimerConfig {
  focus_duration_minutes: number;
  short_break_minutes: number;
  long_break_minutes: number;
  sessions_before_long_break: number;
  auto_start_break: boolean;
  auto_start_next_focus: boolean;
}

const DEFAULT_CONFIG: TimerConfig = {
  focus_duration_minutes: 25,
  short_break_minutes: 5,
  long_break_minutes: 15,
  sessions_before_long_break: 4,
  auto_start_break: true,
  auto_start_next_focus: true
};

export default function FocusTimerPage() {
  const [topic, setTopic] = useState('');
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<TimerConfig>(DEFAULT_CONFIG);

  // Poll for timer status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timerState?.is_active) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`${API_BASE}/status`);
          if (response.ok) {
            const data = await response.json();
            setTimerState(data.state);
          }
        } catch (error) {
          console.error('Error polling timer:', error);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [timerState?.is_active]);

  const startSession = async () => {
    if (!topic.trim()) {
      alert('Please enter a topic to focus on');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic,
          config: config
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTimerState(data.state);
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }
    setIsLoading(false);
  };

  const performAction = async (action: string) => {
    try {
      const response = await fetch(`${API_BASE}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (action === 'stop') {
          setTimerState(null);
        } else {
          setTimerState(data.state);
        }
      }
    } catch (error) {
      console.error('Error performing action:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'focus': return 'bg-blue-500';
      case 'short_break': return 'bg-amber-400';
      case 'long_break': return 'bg-purple-400';
      case 'paused': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'focus': return '🔥 Deep Focus';
      case 'short_break': return '☕ Short Break';
      case 'long_break': return '😴 Long Break';
      case 'paused': return '⏸️ Paused';
      default: return 'Idle';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        🎯 Focus Timer
      </h1>

      {/* Topic Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          What are you working on?
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., Math Chapter 3, Essay Draft..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={timerState?.is_active}
        />
      </div>

      {/* Timer Display */}
      {timerState && (
        <div className="text-center mb-8 p-6 bg-white rounded-2xl shadow-lg">
          <div className="text-sm font-medium text-gray-500 mb-2">
            {getPhaseLabel(timerState.phase)}
          </div>
          
          <div className={`text-7xl font-mono font-bold mb-4 ${
            timerState.phase === 'focus' ? 'text-blue-600' : 
            timerState.phase === 'short_break' ? 'text-amber-600' : 
            timerState.phase === 'long_break' ? 'text-purple-600' : 'text-gray-600'
          }`}>
            {formatTime(timerState.time_remaining_seconds)}
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div 
              className={`h-2.5 rounded-full transition-all duration-1000 ${getPhaseColor(timerState.phase)}`}
              style={{ width: `${timerState.progress_percentage}%` }}
            />
          </div>

          <div className="text-sm text-gray-500">
            Session {timerState.session_number} • {timerState.progress_percentage}% complete
            {timerState.is_paused && ' • PAUSED'}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-4 mb-8">
        {!timerState?.is_active ? (
          <button
            onClick={startSession}
            disabled={isLoading || !topic.trim()}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Starting...' : '▶️ Start Focus Session'}
          </button>
        ) : (
          <>
            {timerState.is_paused ? (
              <button
                onClick={() => performAction('resume')}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
              >
                ▶️ Resume
              </button>
            ) : (
              <button
                onClick={() => performAction('pause')}
                className="px-6 py-3 bg-amber-500也正是 text-white rounded-lg font-semibold hover:bg-amber-700"
              >
                ⏸️ Pause
              </button>
            )}
            
            <button
              onClick={() => performAction('skip')}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700"
            >
              ⏭️ Skip
            </button>
            
            <button
              onClick={() => performAction('stop')}
              className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
            >
              ⏹️ Stop
            </button>
          </>
        )}
      </div>

      {/* Configuration */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">⚙️ Timer Configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Focus (min)</label>
            <input
              type="number"
              value={config.focus_duration_minutes}
              onChange={(e) => setConfig({...config, focus_duration_minutes: Number(e.target.value)})}
              className="w-full px-3 py-2 border rounded"
              min="5"
              max="120"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Short Break</label>
            <input
              type="number"
              value={config.short_break_minutes}
              onChange={(e) => setConfig({...config, short_break_minutes: Number(e.target.value)})}
              className="w-full px-3 py-2 border rounded"
              min="1"
              max="30"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Long Break</label>
            <input
              type="number"
              value={config.long_break_minutes}
              onChange={(e) => setConfig({...config, long_break_minutes: Number(e.target.value)})}
              className="w-full px-3 py-2 border rounded"
              min="5"
              max="60"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Sessions</label>
            <input
              type="number"
              value={config.sessions_before_long_break}
              onChange={(e) => setConfig({...config, sessions_before_long_break: Number(e.target.value)})}
              className="w-full px-3 py-2 border rounded"
              min="2"
              max="8"
            />
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 text-center">
        <p>💡 The timer will automatically transition between focus and break sessions.</p>
        <p>After {config.sessions_before_long_break} focus sessions, a longer break will begin.</p>
      </div>
Nd    </div>
  );
}