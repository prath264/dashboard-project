import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/register', label: 'Register' },
  { to: '/status', label: 'My Status' },
  { to: '/admin', label: 'Admin' },
  { to: '/scan', label: 'Check In / Out' },
  { to: '/reports', label: 'Reports' },
]

export default function Layout() {
  return (
    <>
      <header className="site-header">
        <div>
          <h1>Visitor Management</h1>
          <p className="subtitle">Register, approve, and track visits</p>
        </div>
        <nav className="nav">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  )
}
