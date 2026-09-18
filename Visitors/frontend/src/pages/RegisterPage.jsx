import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchEmployees, registerVisitor } from '../api'
import { Alert } from '../components/Alert'
import TypeaheadSelect from '../components/TypeaheadSelect'

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  host_employee: '',
  host_email: '',
  purpose: '',
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [employees, setEmployees] = useState([])
  const [employeesLoading, setEmployeesLoading] = useState(true)
  const [employeesError, setEmployeesError] = useState('')
  const [selfie, setSelfie] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const hostOptions = useMemo(
    () =>
      employees.map((emp) => ({
        id: emp.email,
        label: emp.display_name,
        description: emp.email,
      })),
    [employees],
  )

  useEffect(() => {
    async function loadEmployees() {
      setEmployeesLoading(true)
      setEmployeesError('')
      try {
        const data = await fetchEmployees()
        setEmployees(data)
      } catch (err) {
        setEmployeesError(err.message)
      } finally {
        setEmployeesLoading(false)
      }
    }
    loadEmployees()
  }, [])

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleHostSelect(option) {
    if (option) {
      setForm((prev) => ({
        ...prev,
        host_email: option.id,
        host_employee: option.label,
      }))
    } else {
      setForm((prev) => ({ ...prev, host_email: '', host_employee: '' }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.host_email) {
      setError('Please select a host employee.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const data = new FormData()
      Object.entries(form).forEach(([key, value]) => data.append(key, value))
      if (selfie) data.append('selfie', selfie)

      const visitor = await registerVisitor(data)
      navigate(`/status/${visitor.id}`, {
        state: { message: 'Registration submitted. Awaiting approval.' },
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="card page-narrow">
      <h2>Register as Visitor</h2>
      <p className="meta page-intro">
        Submit your details and purpose of visit. Your host will be notified by email for approval.
      </p>
      <Alert type="error" message={error} />
      <Alert type="error" message={employeesError} />
      <form onSubmit={handleSubmit}>
        <label>
          Full Name
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label>
          Phone
          <input name="phone" type="tel" value={form.phone} onChange={handleChange} required />
        </label>
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={handleChange} required />
        </label>
        <label>
          Host Employee
          <TypeaheadSelect
            id="host-employee"
            options={hostOptions}
            value={form.host_email}
            onChange={handleHostSelect}
            placeholder="Type to search by name…"
            loading={employeesLoading}
            disabled={employeesLoading || hostOptions.length === 0}
          />
        </label>
        <label>
          Purpose of Visit
          <textarea name="purpose" value={form.purpose} onChange={handleChange} required />
        </label>
        <label>
          Selfie
          <input
            type="file"
            accept="image/*"
            capture="user"
            onChange={(e) => setSelfie(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          type="submit"
          className="btn-primary"
          disabled={submitting || employeesLoading || !form.host_email}
        >
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </form>
      <p className="meta" style={{ marginTop: '1rem' }}>
        Already registered? <Link to="/status">Check your visit status</Link>
      </p>
    </section>
  )
}
