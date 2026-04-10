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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function getStatusTone(status = '') {
  if (['Delivered', 'Paid', 'Available'].includes(status)) return 'success';
  if (['Cancelled', 'Failed', 'Unavailable'].includes(status)) return 'danger';
  if (['Pending', 'Unpaid'].includes(status)) return 'warning';
  if (['Assigned', 'Picked Up', 'In Transit', 'Out for Delivery'].includes(status)) return 'info';
  return 'muted';
}
