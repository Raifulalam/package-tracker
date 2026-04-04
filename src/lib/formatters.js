export function formatDateTime(value) {
  if (!value) return 'Not available';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatStatusClass(status = '') {
  return status.toLowerCase().replace(/\s+/g, '-');
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function getStatusTone(status = '') {
  if (['Delivered'].includes(status)) return 'success';
  if (['Cancelled', 'Exception'].includes(status)) return 'danger';
  if (['Requested', 'Approved', 'Scheduled'].includes(status)) return 'info';
  if (['Assigned', 'Picked Up', 'In Transit', 'Out for Delivery', 'Delayed'].includes(status)) return 'warning';
  return 'muted';
}
