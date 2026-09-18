import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { approveVisitor, fetchVisitors, rejectVisitor, selfieUrl } from '../api'
import { Alert } from '../components/Alert'
import { SelfiePreview } from '../components/SelfiePreview'
import { StatusBadge } from '../components/StatusBadge'
import { formatDate } from '../utils'

function PendingCard({ visitor, onAction }) {
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const selfie = selfieUrl(visitor.selfie_path)

  async function run(action, label) {
    if (!window.confirm(`${label} visit request from ${visitor.name}?`)) return
    setBusy(label)
    setError('')
    try {
      const result = await action(visitor.id)
      onAction(result.message)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <article className="admin-card">
      <div className="admin-card-body">
        <div className="admin-card-info">
          <div className="visitor-header">
            <div>
              <div className="visitor-name">{visitor.name}</div>
              <StatusBadge status={visitor.status} />
            </div>
          </div>
          <p className="meta"><strong>Host:</strong> {visitor.host_employee}</p>
          <p className="meta"><strong>Purpose:</strong> {visitor.purpose}</p>
          <p className="meta">
            <strong>Contact:</strong> {visitor.phone} · {visitor.email}
          </p>
          <p className="meta"><strong>Requested:</strong> {formatDate(visitor.created_at)}</p>
        </div>

        <div className="admin-selfie-panel">
          <p className="admin-selfie-title">Selfie Preview</p>
          <SelfiePreview src={selfie} name={visitor.name} size="admin" />
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      <div className="admin-actions">
        <button
          type="button"
          className="btn-success btn-lg admin-btn-approve"
          disabled={Boolean(busy)}
          onClick={() => run(approveVisitor, 'Approve')}
        >
          {busy === 'Approve' ? 'Approving…' : '✓ Approve Visit'}
        </button>
        <button
          type="button"
          className="btn-danger btn-lg admin-btn-reject"
          disabled={Boolean(busy)}
          onClick={() => run(rejectVisitor, 'Reject')}
        >
          {busy === 'Reject' ? 'Rejecting…' : '✕ Reject Visit'}
        </button>
        <Link to={`/status/${visitor.id}`} className="btn-secondary btn-sm link-btn admin-btn-view">
          View Details
        </Link>
      </div>
    </article>
  )
}

export default function AdminPage() {
  const [visitors, setVisitors] = useState([])
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState('')
  const [error, setError] = useState('')

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

  const pending = visitors.filter((v) => v.status === 'pending')
  const recent = visitors.filter((v) => v.status !== 'pending').slice(0, 5)

  function handleAction(message) {
    setFlash(message)
    load()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Admin Dashboard</h2>
          <p className="meta">Review pending requests — approve or reject with selfie verification.</p>
        </div>
        <button type="button" className="btn-secondary btn-sm" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      <Alert type="success" message={flash} onDismiss={() => setFlash('')} />
      <Alert type="error" message={error} />

      <section className="card">
        <h3>Pending Requests ({pending.length})</h3>
        {loading ? (
          <p className="empty">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="empty">No pending requests.</p>
        ) : (
          <div className="visitor-list">
            {pending.map((visitor) => (
              <PendingCard key={visitor.id} visitor={visitor} onAction={handleAction} />
            ))}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section className="card" style={{ marginTop: '1.5rem' }}>
          <h3>Recently Processed</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Host</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link to={`/status/${v.id}`}>{v.name}</Link>
                    </td>
                    <td>{v.host_employee}</td>
                    <td><StatusBadge status={v.status} /></td>
                    <td>{formatDate(v.approved_at || v.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}
