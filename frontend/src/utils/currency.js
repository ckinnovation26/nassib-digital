// Configuration de la monnaie pour l'application Nassib
export const CURRENCY_SYMBOL = 'KMF';
export const CURRENCY_CODE = 'KMF';

// Formater un montant avec la monnaie
export const formatCurrency = (amount) => {
  return `${amount.toFixed(0)} ${CURRENCY_SYMBOL}`;
};

// Pour l'affichage avec décimales si nécessaire
export const formatCurrencyDetailed = (amount) => {
  return `${amount.toFixed(2)} ${CURRENCY_SYMBOL}`;
};
