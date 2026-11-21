import React from 'react'

export default function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  onFocus,
  onBlur,
  disabled = false,
  ...props
}) {
  const [isFocused, setIsFocused] = React.useState(false)

  const handleFocus = (e) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e) => {
    setIsFocused(false)
    onBlur?.(e)
  }

  const style = getInputStyles(isFocused, disabled)

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      style={style}
      {...props}
    />
  )
}

function getInputStyles(isFocused, disabled) {
  return {
    width: '100%',
    padding: 'var(--input-padding, 0.75rem 1rem)',
    borderRadius: 'var(--input-radius, 24px)',
    border: `1px solid ${disabled ? 'var(--input-border-disabled, #E0E0E0)' : isFocused ? 'var(--input-border-focus, var(--color-primary))' : 'var(--input-border, rgba(0, 0, 0, 0.1))'}`,
    background: 'var(--input-bg, rgba(255, 255, 255, 0.75))',
    color: 'var(--color-text, #212121)',
    fontSize: 'var(--input-font-size, 1rem)',
    fontFamily: 'var(--input-font, system-ui, sans-serif)',
    outline: 'none',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(12px)',
    ...(isFocused && {
      boxShadow: 'var(--input-shadow-focus, 0 0 0 3px var(--color-focus-alpha, rgba(0, 173, 193, 0.3)))',
    }),
    ...(disabled && {
      opacity: 0.5,
      cursor: 'not-allowed',
    }),
  }
}