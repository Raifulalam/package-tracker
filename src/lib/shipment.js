export const shipmentStatuses = [
  'Pending',
  'Assigned',
  'Picked Up',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

export const agentProgressionStatuses = ['Picked Up', 'In Transit', 'Out for Delivery'];

export const paymentStatuses = ['Paid', 'Unpaid', 'Failed'];

export function computeShipmentStats(shipments = []) {
  return shipments.reduce(
    (acc, shipment) => {
      acc.total += 1;
      if (shipment.status === 'Pending') acc.pending += 1;
      if (shipment.status === 'Assigned') acc.assigned += 1;
      if (['Picked Up', 'In Transit', 'Out for Delivery'].includes(shipment.status)) acc.inTransit += 1;
      if (shipment.status === 'Delivered') acc.delivered += 1;
      if (shipment.status === 'Cancelled') acc.cancelled += 1;
      if (shipment.paymentStatus === 'Unpaid') acc.unpaid += 1;
      return acc;
    },
    { total: 0, pending: 0, assigned: 0, inTransit: 0, delivered: 0, cancelled: 0, unpaid: 0 }
  );
}

export function roleHome(role) {
  if (role === 'admin') return '/admin';
  if (role === 'agent') return '/agent';
  if (role === 'receiver') return '/receiver';
  return '/dashboard';
}

export function paymentTone(status) {
  if (status === 'Paid') return 'success';
  if (status === 'Failed') return 'danger';
  if (status === 'Unpaid') return 'warning';
  return 'muted';
}
