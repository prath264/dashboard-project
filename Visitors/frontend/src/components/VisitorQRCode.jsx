import { QRCodeSVG } from 'qrcode.react'

export function VisitorQRCode({ value, size = 180 }) {
  if (!value) return null
  return (
    <div className="qr-code-wrap">
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        includeMargin
        bgColor="#ffffff"
        fgColor="#1a1a2e"
      />
    </div>
  )
}
