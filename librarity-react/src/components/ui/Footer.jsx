import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <p>
        By Unbinding &middot; <Link to="/">Home</Link> &middot; <Link to="/admin">Admin</Link>
      </p>
    </footer>
  )
}
