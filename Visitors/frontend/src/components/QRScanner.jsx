import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export function QRScanner({ onScan, paused = false }) {
  const scannerRef = useRef(null)
  const html5QrRef = useRef(null)
  const [cameraError, setCameraError] = useState('')
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (paused) return undefined

    const scannerId = 'qr-reader'
    let cancelled = false

    async function start() {
      try {
        const cameras = await Html5Qrcode.getCameras()
        if (cancelled) return
        if (!cameras.length) {
          setCameraError('No camera found on this device.')
          return
        }

        const html5Qr = new Html5Qrcode(scannerId)
        html5QrRef.current = html5Qr

        const backCamera = cameras.find((c) =>
          /back|rear|environment/i.test(c.label),
        )
        const cameraId = backCamera?.id ?? cameras[0].id

        await html5Qr.start(
          cameraId,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScan(decodedText)
          },
          () => {},
        )

        if (!cancelled) {
          setActive(true)
          setCameraError('')
        }
      } catch (err) {
        if (!cancelled) {
          setCameraError(err.message || 'Unable to start camera.')
        }
      }
    }

    start()

    return () => {
      cancelled = true
      const html5Qr = html5QrRef.current
      if (html5Qr?.isScanning) {
        html5Qr.stop().catch(() => {})
      }
      html5QrRef.current = null
      setActive(false)
    }
  }, [onScan, paused])

  return (
    <div className="qr-scanner" ref={scannerRef}>
      <div id="qr-reader" className="qr-reader" />
      {cameraError && <p className="meta scanner-error">{cameraError}</p>}
      {active && !cameraError && (
        <p className="meta scanner-hint">Point camera at visitor QR code</p>
      )}
    </div>
  )
}
