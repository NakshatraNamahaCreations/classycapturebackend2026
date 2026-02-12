exports.getPackageAndServiceQty = (quotation, packageId, serviceId) => {
  const pkg = (quotation.packages || []).find(p => String(p._id) === String(packageId));
  if (!pkg) return { pkg: null, qty: null };
  const s = (pkg.services || []).find(x => String(x._id) === String(serviceId));
  if (!s) return { pkg, qty: null };
  return { pkg, qty: Math.max(1, Number(s.qty || 1)) };
};

exports.getRequiredUnitsForPackage = (quotation, packageId) => {
  const pkg = (quotation.packages || []).find(p => String(p._id) === String(packageId));
  if (!pkg) return 0;
  return (pkg.services || []).reduce((sum, s) => sum + Math.max(1, Number(s.qty || 1)), 0);
};
