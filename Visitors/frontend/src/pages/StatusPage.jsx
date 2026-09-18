import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchVisitor, selfieUrl } from '../api'
import { Alert } from '../components/Alert'
import { StatusBadge } from '../components/StatusBadge'
import { VisitorQRCode } from '../components/VisitorQRCode'
import { formatDate } from '../utils'

function VisitorStatusCard({ visitor }) {
  const selfie = selfieUrl(visitor.selfie_path)
  const showQr =
    visitor.qr_active &&
    (visitor.status === 'approved' || visitor.status === 'checked_in')

  return (
    <div className="status-card">
      <div className="status-card-header">
        <div>
          <h2>{visitor.name}</h2>
          <StatusBadge status={visitor.status} />
        </div>
        {selfie && (
          <img src={selfie} alt={`${visitor.name} selfie`} className="selfie-thumb lg" />
        )}
      </div>

      <dl className="detail-list">
        <div><dt>Visit ID</dt><dd>#{visitor.id}</dd></div>
        <div><dt>Host</dt><dd>{visitor.host_employee}</dd></div>
        <div><dt>Purpose</dt><dd>{visitor.purpose}</dd></div>
        <div><dt>Phone</dt><dd>{visitor.phone}</dd></div>
        <div><dt>Email</dt><dd>{visitor.email}</dd></div>
        <div><dt>Registered</dt><dd>{formatDate(visitor.created_at)}</dd></div>
        {visitor.approved_at && (
          <div><dt>Approved</dt><dd>{formatDate(visitor.approved_at)}</dd></div>
        )}
        {visitor.checked_in_at && (
          <div><dt>Checked in</dt><dd>{formatDate(visitor.checked_in_at)}</dd></div>
        )}
        {visitor.checked_out_at && (
          <div><dt>Checked out</dt><dd>{formatDate(visitor.checked_out_at)}</dd></div>
        )}
      </dl>

      {visitor.status === 'pending' && (
        <p className="status-hint">Your request is awaiting admin approval.</p>
      )}
      {visitor.status === 'rejected' && (
        <div className="rejection-notice">
          <strong>Visit request rejected</strong>
          <p>
            A notification has been sent to <strong>{visitor.email}</strong> and{' '}
            <strong>{visitor.phone}</strong>. Please contact {visitor.host_employee} if you
            have questions.
          </p>
        </div>
      )}
      {visitor.status === 'approved' && (
        <p className="status-hint">Show this QR code at the gate to check in.</p>
      )}
      {visitor.status === 'checked_in' && (
        <p className="status-hint">You are checked in. Scan QR again when leaving.</p>
      )}
      {visitor.status === 'checked_out' && (
        <p className="status-hint">Visit completed. Thank you!</p>
      )}

      {showQr && visitor.qr_code && (
        <div className="qr-display">
          <VisitorQRCode value={visitor.qr_code} size={200} />
          <p className="meta token">Token: {visitor.qr_code}</p>
          <Link to="/scan" className="btn-secondary btn-sm qr-link">
            Go to Check-In Station
          </Link>
        </div>
      )}
    </div>
  )
}

export default function StatusPage() {
  const { id: paramId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [lookupId, setLookupId] = useState(paramId ?? '')
  const [visitor, setVisitor] = useState(null)
  const [loading, setLoading] = useState(Boolean(paramId))
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(location.state?.message ?? '')

  const loadVisitor = useCallback(async (id) => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchVisitor(id)
      setVisitor(data)
    } catch (err) {
      setVisitor(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (paramId) {
      setLookupId(paramId)
      loadVisitor(paramId)
    }
  }, [paramId, loadVisitor])

  function handleLookup(e) {
    e.preventDefault()
    if (!lookupId.trim()) return
    navigate(`/status/${lookupId.trim()}`)
  }

  return (
    <div className="page-narrow">
      <Alert type="success" message={flash} onDismiss={() => setFlash('')} />

      {!paramId && (
        <section className="card">
          <h2>Check Visit Status</h2>
          <p className="meta page-intro">Enter your visit ID from the confirmation screen.</p>
          <form onSubmit={handleLookup} className="lookup-form">
            <input
              type="number"
              min="1"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="Visit ID"
              required
            />
            <button type="submit" className="btn-primary">Look Up</button>
          </form>
        </section>
      )}

      {paramId && loading && (
        <section className="card"><p className="empty">Loading visit details…</p></section>
      )}

      {paramId && error && !loading && (
        <section className="card">
          <Alert type="error" message={error} />
          <Link to="/status" className="btn-secondary btn-sm">Try another ID</Link>
        </section>
      )}

      {visitor && !loading && (
        <section className="card">
          <VisitorStatusCard visitor={visitor} />
          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ marginTop: '1rem' }}
            onClick={() => loadVisitor(paramId)}
          >
            Refresh Status
          </button>
        </section>
      )}
    </div>
  )
}
