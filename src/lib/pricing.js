export function buildLocationLabel(location = {}) {
  return [location.city, location.district, location.province].filter(Boolean).join(', ');
}

export function getRouteType(senderLocation = {}, receiverLocation = {}) {
  if (senderLocation.city && receiverLocation.city && senderLocation.city === receiverLocation.city) {
    return 'sameCity';
  }

  if (
    senderLocation.district &&
    receiverLocation.district &&
    senderLocation.district === receiverLocation.district
  ) {
    return 'sameDistrict';
  }

  if (
    senderLocation.province &&
    receiverLocation.province &&
    senderLocation.province === receiverLocation.province
  ) {
    return 'sameProvince';
  }

  return 'differentProvince';
}

export function calculateEstimatedPrice({
  senderLocation,
  receiverLocation,
  weight,
  deliveryType,
  paymentMode,
  pricing,
}) {
  const parsedWeight = Math.max(Number(weight || 0), 0);
  const routeType = getRouteType(senderLocation, receiverLocation);
  const basePrice = Number(pricing?.[routeType] || 0);
  const perKgRate = Number(pricing?.perKgRate || 0);
  const deliveryMultiplier = deliveryType === 'express' ? Number(pricing?.expressMultiplier || 1) : 1;
  const codCharge = paymentMode === 'cod' ? Number(pricing?.codCharge || 0) : 0;
  const totalPrice = (basePrice + parsedWeight * perKgRate) * deliveryMultiplier + codCharge;

  return {
    routeType,
    basePrice,
    perKgRate,
    deliveryMultiplier,
    codCharge,
    totalPrice: Math.round((totalPrice + Number.EPSILON) * 100) / 100,
  };
}

export function getRouteLabel(routeType) {
  return {
    sameCity: 'Same city route',
    sameDistrict: 'Same district route',
    sameProvince: 'Same province route',
    differentProvince: 'Different province route',
  }[routeType] || 'Route pricing';
}
