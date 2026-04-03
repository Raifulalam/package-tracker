import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

export function useLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadLocations = async () => {
      try {
        const response = await api.get('/api/locations');

        if (!active) return;

        setLocations(response.data || []);
        setError('');
      } catch (err) {
        if (active) {
          setError(
            `${err.message} Make sure the backend is running and the frontend is pointing to the same server.`
          );
          setLocations([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadLocations();

    return () => {
      active = false;
    };
  }, []);

  const provinceLookup = useMemo(
    () =>
      new Map(
        locations.map((provinceEntry) => [
          provinceEntry.province,
          new Map(
            provinceEntry.districts.map((districtEntry) => [districtEntry.district, districtEntry.cities])
          ),
        ])
      ),
    [locations]
  );

  const getDistricts = (province) => Array.from(provinceLookup.get(province)?.keys() || []);

  const getCities = (province, district) => provinceLookup.get(province)?.get(district) || [];

  return {
    locations,
    provinces: locations.map((provinceEntry) => provinceEntry.province),
    loading,
    error,
    getDistricts,
    getCities,
  };
}
