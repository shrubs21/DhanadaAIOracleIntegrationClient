'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const navStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');

  .nb-root {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 9999;
    padding: 14px 24px;
    display: flex;
    justify-content: center;
    pointer-events: none;
    font-family: 'DM Sans', sans-serif;
  }
  .nb-inner {
    pointer-events: auto;
    width: 100%;
    max-width: 1180px;
  }

  /* ── PILL / CIRCULAR NAVBAR ── */
  .nb-bar {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px 8px 10px;
    border-radius: 999px;
    background: #03045E;
    border: none;
    box-shadow: 0 4px 16px rgba(0,0,0,0.35);
    transition: box-shadow 0.3s ease;
  }
  .nb-bar.scrolled {
    box-shadow: 0 6px 24px rgba(0,0,0,0.45);
  }

  /* ── Logo ── */
  .nb-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    padding-left: 4px;
  }
  .nb-logo-img-wrap {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #02033a;
    border: 1.5px solid rgba(255,255,255,0.15);
    overflow: hidden;
    flex-shrink: 0;
    transition: border-color 0.2s ease, transform 0.2s ease;
  }
  .nb-logo:hover .nb-logo-img-wrap {
    border-color: #00C853;
    transform: scale(1.05);
  }
  .nb-logo-img {
    width: 34px;
    height: 34px;
    object-fit: contain;
  }
  .nb-logo-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    line-height: 1;
  }
  .nb-logo-name {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 1.18rem;
    letter-spacing: 0.01em;
    line-height: 1;
  }
  /* D = white, T = green */
  .nb-logo-d { color: #ffffff; }
  .nb-logo-t { color: #00C853; }

  .nb-logo-sub {
    font-family: 'DM Sans', sans-serif;
    font-size: 0.58rem;
    font-weight: 500;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
  }

  /* ── Actions ── */
  .nb-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
    padding-right: 4px;
  }
  .nb-btn-login {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 20px;
    border-radius: 999px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    font-weight: 600;
    color: #fff;
    text-decoration: none;
    background: transparent;
    border: 1.5px solid rgba(255,255,255,0.28);
    transition: all 0.2s ease;
  }
  .nb-btn-login:hover {
    border-color: #fff;
    background: rgba(255,255,255,0.08);
  }
  .nb-btn-register {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 22px;
    border-radius: 999px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    font-weight: 700;
    color: #03045E;
    text-decoration: none;
    background: #00C853;
    border: 1.5px solid #00C853;
    transition: all 0.2s ease;
  }
  .nb-btn-register:hover {
    background: #00b349;
    border-color: #00b349;
    transform: translateY(-1px);
  }
  .nb-btn-register:active { transform: translateY(0); }

  /* ── Avatar ── */
  .nb-avatar-btn {
    width: 38px; height: 38px;
    border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.25);
    background: #02033a;
    color: #fff;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex; align-items: center; justify-content: center;
  }
  .nb-avatar-btn:hover { border-color: #00C853; }

  /* ── Dropdown ── */
  .nb-dropdown {
    position: absolute;
    top: calc(100% + 12px);
    right: 0;
    width: 228px;
    border-radius: 20px;
    overflow: hidden;
    background: #03045E;
    border: 1px solid rgba(255,255,255,0.1);
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
    animation: nbDropIn 0.18s ease forwards;
  }
  @keyframes nbDropIn {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .nb-drop-header {
    padding: 16px 18px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    display: flex; align-items: center; gap: 12px;
  }
  .nb-drop-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: #02033a;
    border: 1.5px solid rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Syne', sans-serif;
    font-weight: 700; font-size: 0.9rem; color: #fff; flex-shrink: 0;
  }
  .nb-drop-info { overflow: hidden; }
  .nb-drop-label {
    font-size: 0.6rem; font-weight: 500;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: rgba(255,255,255,0.4); margin-bottom: 2px;
  }
  .nb-drop-name {
    font-family: 'Syne', sans-serif;
    font-weight: 700; font-size: 0.9rem; color: #fff;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .nb-drop-body { padding: 8px; }
  .nb-drop-item {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 10px 13px; border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.84rem; font-weight: 500;
    color: rgba(255,255,255,0.7);
    text-decoration: none; background: none; border: none;
    cursor: pointer; text-align: left;
    transition: all 0.15s ease;
  }
  .nb-drop-item:hover { background: rgba(255,255,255,0.07); color: #fff; }
  .nb-drop-item.danger { color: rgba(255,100,100,0.8); }
  .nb-drop-item.danger:hover { background: rgba(255,60,60,0.08); color: #ff7070; }
  .nb-drop-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 4px 8px; }
`

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuRef = useRef(null)

  const userName = "Chandhresh"
  const userInitial = userName.charAt(0).toUpperCase()

  useEffect(() => {
    const id = 'nb-styles'
    if (!document.getElementById(id)) {
      const tag = document.createElement('style')
      tag.id = id
      tag.textContent = navStyles
      document.head.appendChild(tag)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem("loggedIn")
      setIsLoggedIn(stored === "true")
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    const handleEsc = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEsc)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [menuOpen])

  const handleLogout = () => {
    localStorage.removeItem("loggedIn")
    setIsLoggedIn(false)
    setMenuOpen(false)
    window.location.href = "/login"
  }

  return (
    <header className="nb-root">
      <div className="nb-inner">
        <nav className={`nb-bar${scrolled ? ' scrolled' : ''}`}>

          {/* ── Logo ── */}
          <Link href="/" className="nb-logo">
            <div className="nb-logo-img-wrap">
              <img
                src="/assets/logo.png"
                alt="DigiTrans"
                className="nb-logo-img"
              />
            </div>
            <div className="nb-logo-text">
              <span className="nb-logo-name">
                <span className="nb-logo-d">D</span>
                <span className="nb-logo-t">T</span>
              </span>
              <span className="nb-logo-sub">Technology</span>
            </div>
          </Link>

          {/* ── Right Side ── */}
          <div className="nb-actions" ref={menuRef}>
            {!isLoggedIn ? (
              <>
                <Link href="/login" className="nb-btn-login">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Sign In
                </Link>
                <Link href="/register" className="nb-btn-register">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <line x1="19" y1="8" x2="19" y2="14"/>
                    <line x1="22" y1="11" x2="16" y2="11"/>
                  </svg>
                  Get Started
                </Link>
              </>
            ) : (
              <div style={{ position: 'relative' }}>
                <button className="nb-avatar-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="User menu">
                  {userInitial}
                </button>

                {menuOpen && (
                  <div className="nb-dropdown">
                    <div className="nb-drop-header">
                      <div className="nb-drop-avatar">{userInitial}</div>
                      <div className="nb-drop-info">
                        <p className="nb-drop-label">Signed in as</p>
                        <p className="nb-drop-name">{userName}</p>
                      </div>
                    </div>
                    <div className="nb-drop-body">
                      <Link href="/account" className="nb-drop-item" onClick={() => setMenuOpen(false)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                        My Account
                      </Link>
                      <Link href="/settings" className="nb-drop-item" onClick={() => setMenuOpen(false)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                        Settings
                      </Link>
                      <div className="nb-drop-divider" />
                      <button className="nb-drop-item danger" onClick={handleLogout}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                          <polyline points="16 17 21 12 16 7"/>
                          <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </nav>
      </div>
    </header>
  )
}