import type { CSSProperties } from 'react'
import { getTheme, type ThemeId } from '../theme'
import './ThemePicker.css'

export type ThemePickerOption = {
  value: string
  label: string
  // Which palette the swatch previews.
  theme: ThemeId
}

export default function ThemePicker({ label = 'Theme', value, options, onChange }: {
  label?: string
  value: string
  options: ThemePickerOption[]
  onChange: (value: string) => void
}) {
  return (
    <div className="theme-picker" role="radiogroup" aria-label={label}>
      <div className="theme-picker-label">{label}</div>
      <div className="theme-picker-options">
        {options.map((option) => {
          const { tokens } = getTheme(option.theme)
          const swatch = {
            '--swatch-bg': tokens['bg-card'],
            '--swatch-accent': tokens.accent,
            '--swatch-accent-2': tokens['accent-2'],
          } as CSSProperties
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={value === option.value}
              className="theme-picker-option"
              onClick={() => onChange(option.value)}
            >
              <span className="theme-picker-swatch" style={swatch} aria-hidden="true" />
              <span className="theme-picker-name">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
