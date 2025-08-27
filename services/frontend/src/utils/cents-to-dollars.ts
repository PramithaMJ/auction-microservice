const centsToLKR = (cents: number) => {
  const amount = cents / 100;
  return amount.toLocaleString('en-LK', {
    style: 'currency',
    currency: 'LKR',
  });
};

// Keep the old function name for backward compatibility
const centsToDollars = centsToLKR;

export { centsToDollars, centsToLKR };
