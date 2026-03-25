import React from 'react';
import { useState } from 'react';

const initialFormState = {
  name: '',
  email: '',
  preferredMonth: ''
};

export function WaitlistForm() {
  const [formData, setFormData] = useState(initialFormState);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  return (
    <div className="form-wrap">
      <form
        className="waitlist-form"
        action="https://formspree.io/f/mdawqqvp"
        method="POST"
      >
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
          Preferred month (optional)
          <input
            type="text"
            name="preferredMonth"
            value={formData.preferredMonth}
            onChange={handleChange}
            placeholder="e.g. September"
          />
        </label>

        <button type="submit">Join the waitlist</button>
      </form>
    </div>
  );
}
