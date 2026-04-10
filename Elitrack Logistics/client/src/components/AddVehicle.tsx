import { useEffect, useState } from 'react';
import { VEHICLE_CATEGORY_OPTIONS } from './VehicleCategory';

const STANDARD_CATEGORIES = VEHICLE_CATEGORY_OPTIONS.map((item) => item.key);

const buildInitialState = (initialCategory, initialVehicle) => {
  if (!initialVehicle) {
    return {
      category: initialCategory || 'truck',
      custom_category: '',
      vehicle_name: '',
      plate_number: '',
      tracking_enabled: true,
    };
  }

  const normalizedCategory = String(initialVehicle.category || 'other').toLowerCase();
  const useStandardCategory = STANDARD_CATEGORIES.includes(normalizedCategory);

  return {
    category: useStandardCategory ? normalizedCategory : 'other',
    custom_category: useStandardCategory ? '' : normalizedCategory,
    vehicle_name: initialVehicle.vehicle_name || '',
    plate_number: initialVehicle.plate_number || '',
    tracking_enabled: Boolean(initialVehicle.tracking_enabled),
  };
};

export default function AddVehicle({
  initialCategory,
  initialVehicle,
  submitting,
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(buildInitialState(initialCategory, initialVehicle));
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setForm(buildInitialState(initialCategory, initialVehicle));
    setFormError('');
  }, [initialCategory, initialVehicle]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.vehicle_name.trim()) {
      setFormError('Vehicle name is required.');
      return;
    }

    if (!form.plate_number.trim()) {
      setFormError('Plate number is required.');
      return;
    }

    if (form.category === 'other' && !form.custom_category.trim()) {
      setFormError('Provide a custom category when Other is selected.');
      return;
    }

    const payload = {
      category: form.category,
      custom_category: form.custom_category,
      vehicle_name: form.vehicle_name.trim(),
      plate_number: form.plate_number.trim(),
      tracking_enabled: form.tracking_enabled,
    };

    try {
      await onSubmit(payload);
    } catch (error) {
      setFormError(error.userMessage || error.response?.data?.error || 'Could not save vehicle.');
    }
  };

  const isEditMode = Boolean(initialVehicle);

  return (
    <form className="card fade-up" onSubmit={submit}>
      <div className="section-label">{isEditMode ? 'Edit Vehicle' : 'Add Vehicle'}</div>

      {formError && (
        <div className="fleet-inline-error">
          {formError}
        </div>
      )}

      <div className="form-group">
        <label>Vehicle Category</label>
        <select
          value={form.category}
          onChange={(event) => handleChange('category', event.target.value)}
        >
          {VEHICLE_CATEGORY_OPTIONS.map((category) => (
            <option key={category.key} value={category.key}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      {form.category === 'other' && (
        <div className="form-group">
          <label>Custom Category</label>
          <input
            type="text"
            value={form.custom_category}
            onChange={(event) => handleChange('custom_category', event.target.value)}
            placeholder="e.g. refrigerated trailer"
            maxLength={60}
          />
        </div>
      )}

      <div className="form-group">
        <label>Vehicle Name</label>
        <input
          type="text"
          value={form.vehicle_name}
          onChange={(event) => handleChange('vehicle_name', event.target.value)}
          placeholder="e.g. Copperline Alpha"
          maxLength={120}
        />
      </div>

      <div className="form-group">
        <label>Plate Number</label>
        <input
          type="text"
          value={form.plate_number}
          onChange={(event) => handleChange('plate_number', event.target.value.toUpperCase())}
          placeholder="e.g. ABX 2142"
          maxLength={30}
        />
      </div>

      <label className="fleet-toggle-row">
        <input
          type="checkbox"
          checked={form.tracking_enabled}
          onChange={(event) => handleChange('tracking_enabled', event.target.checked)}
        />
        <span>Enable live tracking for this vehicle</span>
      </label>

      <div className="fleet-form-actions">
        <button type="button" className="btn btn-dark" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-gold" disabled={submitting}>
          {submitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Register Vehicle'}
        </button>
      </div>
    </form>
  );
}
