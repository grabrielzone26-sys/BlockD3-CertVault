import React, { Fragment } from 'react';
import {
  PaintBrushIcon,
  CheckIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';

const THEME_ICONS = {
  institutional: ShieldCheckIcon,
  cyber: SparklesIcon,
};

const ThemeSwitcher = ({ compact = false, className = '' }) => {
  const { theme, themes, updateTheme, activeThemeMeta } = useTheme();
  const isLight = false;

  const ActiveIcon = THEME_ICONS[theme] || PaintBrushIcon;

  return (
    <Menu as="div" className={`relative inline-block text-left z-40 ${className}`}>
      <Menu.Button
        className={`flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full transition-all duration-200 text-xs font-mono tracking-wide shadow-sm group cursor-pointer focus:outline-none ${
          isLight
            ? 'bg-white/95 border border-slate-300/80 text-slate-800 hover:border-blue-500 hover:bg-slate-50'
            : 'bg-slate-900/80 border border-slate-700/60 text-slate-200 hover:border-cyan/50 hover:bg-slate-800/90'
        }`}
        title="Switch color theme"
        aria-label="Switch color theme"
      >
        {/* Color preview dot of current theme */}
        <span
          className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10 shadow-sm flex-shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: activeThemeMeta?.primary || '#1D4ED8' }}
        />

        <ActiveIcon className={`h-3.5 w-3.5 flex-shrink-0 transition-colors ${
          isLight ? 'text-slate-600 group-hover:text-slate-900' : 'text-slate-300 group-hover:text-white'
        }`} />

        {!compact && (
          <span className={`hidden md:inline-block truncate max-w-[120px] ${
            isLight ? 'text-slate-700 group-hover:text-slate-900 font-medium' : 'text-slate-200 group-hover:text-white'
          }`}>
            {activeThemeMeta?.name?.split(' ')[0] || 'Theme'}
          </span>
        )}

        <svg
          className={`h-3 w-3 flex-shrink-0 transition ${
            isLight ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-400 group-hover:text-white'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-120"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className={`origin-top-right absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl focus:outline-none p-2 space-y-1 z-50 backdrop-blur-xl ${
          isLight
            ? 'bg-white/98 border border-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.12),0_0_20px_rgba(29,78,216,0.08)]'
            : 'bg-slate-950/95 border border-slate-700/60 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_25px_rgba(0,229,255,0.1)]'
        }`}>
          <div className={`px-3 py-2 border-b mb-1 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
            <div className="flex items-center justify-between">
              <p className={`text-xs font-semibold uppercase tracking-wider font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Theme Presets
              </p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                isLight ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-800 text-slate-300'
              }`}>
                2 Presets
              </span>
            </div>
            <p className={`text-[11px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Select between enterprise institutional or Web3 cyber palettes.
            </p>
          </div>

          {Object.values(themes).map((item) => {
            const isSelected = item.id === theme;
            const ItemIcon = THEME_ICONS[item.id] || PaintBrushIcon;

            return (
              <Menu.Item key={item.id}>
                {({ active }) => (
                  <button
                    type="button"
                    onClick={() => updateTheme(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? isLight
                          ? 'bg-blue-50/90 border border-blue-400/50 shadow-xs'
                          : 'bg-slate-800/90 border border-cyan/40 shadow-sm'
                        : active
                        ? isLight
                          ? 'bg-slate-100 border border-slate-200 text-slate-900'
                          : 'bg-slate-900 border border-slate-700/60 text-white'
                        : isLight
                        ? 'text-slate-700 border border-transparent hover:bg-slate-50'
                        : 'text-slate-300 border border-transparent hover:bg-slate-900/50'
                    }`}
                  >
                    <div
                      className="mt-0.5 p-1.5 rounded-lg flex-shrink-0"
                      style={{
                        backgroundColor: `${item.primary}18`,
                        border: `1px solid ${item.primary}35`,
                      }}
                    >
                      <ItemIcon className="h-4 w-4" style={{ color: item.primary }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {item.name}
                          </span>
                          {item.badge && (
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-semibold"
                              style={{
                                backgroundColor: `${item.primary}20`,
                                color: item.primary,
                                border: `1px solid ${item.primary}45`,
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <CheckIcon
                            className="h-4 w-4 flex-shrink-0"
                            style={{ color: item.primary }}
                          />
                        )}
                      </div>

                      <p className={`text-[11px] mt-0.5 line-clamp-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        {item.description}
                      </p>

                      {/* Palette Swatch Preview */}
                      <div className="flex items-center gap-1.5 mt-2">
                        {item.swatches.map((colorHex, idx) => (
                          <span
                            key={idx}
                            className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10 shadow-xs flex-shrink-0"
                            style={{ backgroundColor: colorHex }}
                            title={colorHex}
                          />
                        ))}
                        <span className={`text-[10px] font-mono ml-1 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </button>
                )}
              </Menu.Item>
            );
          })}
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default ThemeSwitcher;
