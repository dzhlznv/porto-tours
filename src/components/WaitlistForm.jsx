import React from 'react';
import { useState } from 'react';
import { useForm } from '@formspree/react';

const initialFormState = {
  name: '',
  email: '',
  notes: ''
};

export function WaitlistForm() {
  const [formData, setFormData] = useState(initialFormState);
  const [state, handleSubmit] = useForm('mdawqqvp');

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  if (state.succeeded) {
    return (
      <div className="form-wrap">
        <div className="waitlist-form" role="status" aria-live="polite">
          <h3>Thank you</h3>
          <p>I’ll read this personally and get back to you soon.</p>
          <p>
            <small>In the meantime, Porto is already waiting.</small>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-wrap">
      <form className="waitlist-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            autoComplete="name"
          />
        </label>

        <label>
          Email
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />
        </label>

        <label>
          Notes (optional)
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="anything you'd like to share"
            rows={4}
          />
        </label>

        <button type="submit" disabled={state.submitting}>
          {state.submitting ? 'Sending...' : 'Join the waitlist'}
        </button>
      </form>
    </div>
  );
}
