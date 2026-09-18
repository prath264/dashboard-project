import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchVisitors } from '../api'
import { Alert } from '../components/Alert'
import { StatusBadge } from '../components/StatusBadge'
import { formatDate, visitDuration } from '../utils'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'checked_out', label: 'Completed' },
  { value: 'checked_in', label: 'On Site' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
]

export default function ReportsPage() {
  const [visitors, setVisitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchVisitors()
      setVisitors(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return visitors.filter((v) => {
      if (filter !== 'all' && v.status !== filter) return false
      if (!q) return true
      return (
        v.name.toLowerCase().includes(q) ||
        v.host_employee.toLowerCase().includes(q) ||
        v.email.toLowerCase().includes(q) ||
        String(v.id).includes(q)
      )
    })
  }, [visitors, filter, search])

  const stats = useMemo(() => ({
    total: visitors.length,
    completed: visitors.filter((v) => v.status === 'checked_out').length,
    onSite: visitors.filter((v) => v.status === 'checked_in').length,
    pending: visitors.filter((v) => v.status === 'pending').length,
  }), [visitors])

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Visit Reports</h2>
          <p className="meta">Full log of all visitor requests and completed visits.</p>
        </div>
        <button type="button" className="btn-secondary btn-sm" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      <Alert type="error" message={error} />

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.onSite}</span>
          <span className="stat-label">On Site</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
      </div>

      <section className="card">
        <div className="toolbar">
          <input
            type="search"
            placeholder="Search name, host, email, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="empty">Loading reports…</p>
        ) : filtered.length === 0 ? (
          <p className="empty">No visits match your filters.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Visitor</th>
                  <th>Host</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Checked In</th>
                  <th>Checked Out</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td><Link to={`/status/${v.id}`}>#{v.id}</Link></td>
                    <td>
                      <div>{v.name}</div>
                      <div className="table-sub">{v.email}</div>
                    </td>
                    <td>{v.host_employee}</td>
                    <td className="purpose-cell">{v.purpose}</td>
                    <td><StatusBadge status={v.status} /></td>
                    <td>{formatDate(v.created_at)}</td>
                    <td>{formatDate(v.checked_in_at)}</td>
                    <td>{formatDate(v.checked_out_at)}</td>
                    <td>{visitDuration(v.checked_in_at, v.checked_out_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
