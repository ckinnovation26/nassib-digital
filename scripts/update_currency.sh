#!/bin/bash
cd /app/frontend/src/pages

# Remplacer les affichages de prix dans tous les fichiers
for file in WaiterDashboard.js AccountingDashboard.js Payment.js; do
  # Remplacer $prix par formatCurrency
  sed -i 's/\${\([a-zA-Z._]*\)\.toFixed(2)}/formatCurrency(\1)/g' "$file"
  sed -i 's/\${\([a-zA-Z._]*\)}/formatCurrency(\1)/g' "$file"
done

echo "✅ Mise à jour de la monnaie terminée"