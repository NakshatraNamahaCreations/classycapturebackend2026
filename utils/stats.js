export const buildDateGroupId = (mode = "yearly") => {
  if (mode === "monthly") {
    return {
      year: { $year: "$__date" },
      month: { $month: "$__date" },
    };
  }
  return { year: { $year: "$__date" } };
};

export const normalizeAggOutput = (rows = [], mode = "yearly") => {
  // shape to: [{ year, month?, total }]
  return rows.map((r) => ({
    year: r._id?.year ?? r._id,
    ...(mode === "monthly" ? { month: r._id?.month } : {}),
    total: r.total || 0,
  }));
};
