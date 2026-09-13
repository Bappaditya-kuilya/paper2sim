import { useState } from 'react';

export interface ExportMenuProps {
  onExport?: (format: 'svg' | 'png' | 'json') => void;
  formats?: Array<'svg' | 'png' | 'json'>;
}

export function ExportMenu({
  onExport,
  formats = ['svg', 'png', 'json'],
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatLabels: Record<string, string> = {
    svg: 'SVG (Vector)',
    png: 'PNG (Image)',
    json: 'JSON (Data)',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 text-xs text-zinc-400 border border-zinc-700 rounded hover:bg-zinc-800"
      >
        Export ▾
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-50">
          {formats.map((format) => (
            <button
              key={format}
              onClick={() => {
                onExport?.(format);
                setIsOpen(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
            >
              {formatLabels[format]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface SettingsPanelProps {
  gridSize?: boolean;
  showAxes?: boolean;
  showGrid?: boolean;
  theme?: 'dark' | 'light';
  cameraPosition?: [number, number, number];
  onSettingsChange?: (settings: {
    gridSize?: boolean;
    showAxes?: boolean;
    showGrid?: boolean;
    theme?: 'dark' | 'light';
    cameraPosition?: [number, number, number];
  }) => void;
  onCameraReset?: () => void;
}

export function SettingsPanel({
  gridSize = true,
  showAxes = true,
  showGrid = true,
  theme = 'dark',
  cameraPosition = [5, 5, 5],
  onSettingsChange,
  onCameraReset,
}: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState({
    gridSize,
    showAxes,
    showGrid,
    theme,
    cameraPosition,
  });

  const handleChange = (key: string, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-medium text-zinc-300">Settings</h3>

      <div className="space-y-2">
        <label className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Show Grid</span>
          <input
            type="checkbox"
            checked={localSettings.showGrid}
            onChange={(e) => handleChange('showGrid', e.target.checked)}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-500"
          />
        </label>

        <label className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Show Axes</span>
          <input
            type="checkbox"
            checked={localSettings.showAxes}
            onChange={(e) => handleChange('showAxes', e.target.checked)}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-500"
          />
        </label>

        <label className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Grid Size</span>
          <input
            type="checkbox"
            checked={localSettings.gridSize}
            onChange={(e) => handleChange('gridSize', e.target.checked)}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-500"
          />
        </label>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">Theme</label>
          <select
            value={localSettings.theme}
            onChange={(e) => handleChange('theme', e.target.value)}
            className="w-full px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-300"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>
      </div>

      <button
        onClick={onCameraReset}
        className="w-full px-3 py-1.5 text-xs text-zinc-400 border border-zinc-700 rounded hover:bg-zinc-800"
      >
        Reset Camera
      </button>
    </div>
  );
}
