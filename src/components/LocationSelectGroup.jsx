const LocationSelectGroup = ({
  provinces,
  districts,
  cities,
  values,
  onChange,
  disabled = false,
  required = true,
  provinceName = 'province',
  districtName = 'district',
  cityName = 'city',
  legend = 'Location',
  helperText = '',
}) => (
  <>
    <div className="full-span fieldset-card">
      <div className="section-copy">
        <strong>{legend}</strong>
        {helperText ? <p>{helperText}</p> : null}
      </div>
    </div>

    <label className="field-group">
      <span>Province</span>
      <select
        disabled={disabled}
        name={provinceName}
        onChange={onChange}
        required={required}
        value={values.province}
      >
        <option value="">Select province</option>
        {provinces.map((province) => (
          <option key={province} value={province}>
            {province}
          </option>
        ))}
      </select>
    </label>

    <label className="field-group">
      <span>District</span>
      <select
        disabled={disabled || !values.province}
        name={districtName}
        onChange={onChange}
        required={required}
        value={values.district}
      >
        <option value="">Select district</option>
        {districts.map((district) => (
          <option key={district} value={district}>
            {district}
          </option>
        ))}
      </select>
    </label>

    <label className="field-group">
      <span>City</span>
      <select
        disabled={disabled || !values.district}
        name={cityName}
        onChange={onChange}
        required={required}
        value={values.city}
      >
        <option value="">Select city</option>
        {cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>
    </label>
  </>
);

export default LocationSelectGroup;
