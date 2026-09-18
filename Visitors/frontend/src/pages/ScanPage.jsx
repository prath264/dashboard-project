import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { checkIn, checkOut } from '../api'
import { Alert } from '../components/Alert'
import { QRScanner } from '../components/QRScanner'
import { StatusBadge } from '../components/StatusBadge'

export default function ScanPage() {
  const [qrCode, setQrCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [scannerPaused, setScannerPaused] = useState(false)

  const runAction = useCallback(async (action, label, code) => {
    const token = (code ?? qrCode).trim()
    if (!token) {
      setError('Enter or scan a QR code token')
      return
    }
    setLoading(true)
    setScannerPaused(true)
    setError('')
    setResult(null)
    try {
      const data = await action(token)
      setResult({ label, message: data.message, visitor: data.visitor })
      setQrCode('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setScannerPaused(false)
    }
  }, [qrCode])

  const handleScan = useCallback((decodedText) => {
    setQrCode(decodedText)
    setError('')
  }, [])

  return (
    <div className="page-narrow">
      <section className="card scan-station">
        <h2>Check-In / Check-Out Station</h2>
        <p className="meta page-intro">
          Use the camera to scan a visitor QR code, or paste the token manually.
        </p>

        <Alert type="error" message={error} />

        <QRScanner onScan={handleScan} paused={scannerPaused || loading} />

        <label>
          QR Code Token
          <input
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            placeholder="Scanned token appears here"
          />
        </label>

        <div className="actions scan-actions">
          <button
            type="button"
            className="btn-success btn-lg"
            disabled={loading}
            onClick={() => runAction(checkIn, 'Check In')}
          >
            {loading ? 'Processing…' : 'Check In'}
          </button>
          <button
            type="button"
            className="btn-secondary btn-lg"
            disabled={loading}
            onClick={() => runAction(checkOut, 'Check Out')}
          >
            Check Out
          </button>
        </div>
      </section>

      {result && (
        <section className="card result-card">
          <h3>{result.label} Successful</h3>
          <p className="alert alert-success">{result.message}</p>
          <dl className="detail-list compact">
            <div><dt>Visitor</dt><dd>{result.visitor.name}</dd></div>
            <div><dt>Host</dt><dd>{result.visitor.host_employee}</dd></div>
            <div><dt>Status</dt><dd><StatusBadge status={result.visitor.status} /></dd></div>
          </dl>
          <Link to={`/status/${result.visitor.id}`} className="btn-secondary btn-sm">
            View Visit Details
          </Link>
        </section>
      )}
    </div>
  )
}
