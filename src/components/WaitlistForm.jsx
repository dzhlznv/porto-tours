import { useState } from 'react';
import { track } from '@vercel/analytics';

const initialFormState = {
  name: '',
  email: '',
  preferredMonth: ''
};

export function WaitlistForm() {
  const [formData, setFormData] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('idle');

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    const formElement = event.currentTarget;
    const formPayload = new FormData(formElement);

    try {
      const response = await fetch(formElement.action, {
        method: formElement.method,
        body: formPayload,
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Form submission failed.');
      }

      track('form_submit', { location: 'contact_form' });
      setFormData(initialFormState);
      setSubmitStatus('success');
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="form-wrap">
      <form
        className="waitlist-form"
        action="https://formspree.io/f/mdawqqvp"
        method="POST"
        onSubmit={handleSubmit}
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

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Join the waitlist'}
        </button>

        {submitStatus === 'success' && <p>Thanks! Your request was submitted.</p>}
        {submitStatus === 'error' && (
          <p>Something went wrong. Please try again in a moment.</p>
        )}
      </form>
    </div>
  );
}
