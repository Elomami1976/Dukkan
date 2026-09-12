import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type Props = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  name?: string
  required?: boolean
  minLength?: number
}

export function PasswordField({ id, label, value, onChange, name, required, minLength }: Props) {
  const [visible, setVisible] = useState(false)
  const action = `${visible ? 'إخفاء' : 'إظهار'} ${label}`
  return <div className="password-field">
    <label htmlFor={id}>{label}</label>
    <div className="password-input">
      <input id={id} name={name} type={visible ? 'text' : 'password'} value={value} onChange={event => onChange(event.target.value)} required={required} minLength={minLength} autoComplete="new-password" placeholder="••••••••" />
      <button type="button" className="password-toggle" aria-label={action} title={action} aria-controls={id} aria-pressed={visible} onClick={() => setVisible(current => !current)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
  </div>
}
