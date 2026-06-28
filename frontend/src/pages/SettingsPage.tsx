import { useState } from 'react'

export default function SettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [alarmSound, setAlarmSound] = useState<string('default')
  const [blockDistractions, setBlockDistractions] = useState<boolean>(false)
  const [blockedUrl, setBlockedUrl] = useState<string>('')

  const alarmSounds = [
    { value: 'default', label: 'Default Alarm' },
    { value: 'gentle', label: 'Gentle Chime' },
    { value: 'birdsong', label: 'Birdsong' },
    { value: 'digital', label: 'Digital Beep' },
    { value: 'nature', label: 'Nature Sounds' },
    { value: 'piano', label: 'Piano Melody' },
  ]

  const exampleUrls = ['instagram.com', 'youtube.com', 'netflix.com']

  return (
    <div className="pb-20 lg:pb-6">
      <div className="card">
        <h1 className="text-2xl font-bold gradient-text mb-6">Settings</h1>
        
        <div className="space-y-6">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-gray-200 font-medium">Theme</label>
              <p className="text-gray-500 text-sm">Choose light or dark mode</p>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`relative w-16 h-8 rounded-full transition-colors duration-200 ${
                theme === 'dark' ? 'bg-primary' : 'bg-gray-400'
              }`}
            >
              <span
                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform duration-200 ${
                  theme === 'dark' ? 'left-9' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Alarm Sound Dropdown */}
          <div>
            <label className="text-gray-200 font-medium block mb-2">Alarm Sound</label>
            <select
              value={alarmSound}
              onChange={(e) => setAlarmSound(e.target.value)}
              className="input"
            >
              {alarmSounds.map((sound) => (
                <option key={sound.value} value={sound.value}>
                  {sound.label}
                </option>
              ))}
            </select>
          </div>

          {/* Block Distractions Toggle */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="text-gray-200 font-medium">Block Distractions</label>
                <p className="text-gray-500 text-sm">Block distracting websites during focus sessions</p>
              </div>
              <button
                onClick={() => setBlockDistractions(!blockDistractions)}
                className={`relative w-16 h-8 rounded-full transition-colors duration-200 ${
                  blockDistractions ? 'bg-primary' : 'bg-gray-400'
                }`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform duration-200 ${
                    blockDistractions ? 'left-9' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Extended URL Input Section */}
            {blockDistractions && (
              <div className="mt-4 p-4 bg-dark-elevated rounded-lg border-2 border-primary/40">
                <label className="text-gray-200 font-medium block mb-2">
                  Insert URL to block for focus session
                </label>
                <input
                  type="text"
                  value={blockedUrl}
                  onChange={(e) => setBlockedUrl(e.target.value)}
                  placeholder="Enter URL to block"
                  className="input"
                />
                
                {/* Example URLs */}
                <div className="mt-3">
                  <p className="text-gray-500 text-sm mb-2">Examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {exampleUrls.map((url) => (
                      <span
                        key={url}
                        className="px-3 py-1 bg-dark-surface border border-primary/30 rounded-full text-sm text-gray-400"
                      >
                        {url}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
