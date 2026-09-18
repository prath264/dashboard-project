const API_BASE = '/api/visitors'

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = data.detail
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg).join(', ')
      : detail || data.message || 'Request failed'
    throw new Error(message)
  }
  return data
}

export async function fetchEmployees() {
  const response = await fetch('/api/users')
  return handleResponse(response)
}

export async function fetchVisitors() {
  const response = await fetch(API_BASE)
  return handleResponse(response)
}

export async function fetchVisitor(id) {
  const response = await fetch(`${API_BASE}/${id}`)
  return handleResponse(response)
}

export async function registerVisitor(formData) {
  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse(response)
}

export async function approveVisitor(id) {
  const response = await fetch(`${API_BASE}/${id}/approve`, { method: 'POST' })
  return handleResponse(response)
}

export async function rejectVisitor(id) {
  const response = await fetch(`${API_BASE}/${id}/reject`, { method: 'POST' })
  return handleResponse(response)
}

export async function checkIn(qrCode) {
  const response = await fetch(`${API_BASE}/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qr_code: qrCode }),
  })
  return handleResponse(response)
}

export async function checkOut(qrCode) {
  const response = await fetch(`${API_BASE}/check-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qr_code: qrCode }),
  })
  return handleResponse(response)
}

export function selfieUrl(path) {
  return path ? `/uploads/${path}` : null
}
