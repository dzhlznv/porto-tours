import { useState } from 'react';

const initialFormState = {
  name: '',
  email: '',
  preferredMonth: ''
};

export function WaitlistForm() {
  const [formData, setFormData] = useState(initialFormState);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    setFormData(initialFormState);
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

      {submitted ? (
        <p className="success-message">
          Thank you — your note is in. I’ll be in touch soon.
        </p>
      ) : null}
    </div>
  );
}
