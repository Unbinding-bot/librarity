import React from 'react'
import './Button.css'

export function Button({ variant = 'primary', children, onClick, disabled = false, ...props }) {
  return (
    <button
      className={`btn btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button