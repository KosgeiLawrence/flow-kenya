import { useTranslation } from "react-i18next";
import { useMemo } from "react";

/**
 * Hook to translate dashboard navigation labels.
 * Maps nav item IDs to dashboard translation keys.
 * Falls back to the original label if no translation key matches.
 */

const labelKeyMap: Record<string, string> = {
  // Shared
  "how-it-works": "dashboard.howItWorks",
  "workflows": "dashboard.howItWorks",
  "collection": "dashboard.collections",
  "sales": "dashboard.sales",
  "schedule": "dashboard.requestPickup",
  "my-earnings": "dashboard.myEarnings",
  "earnings-expenses": "dashboard.myEarnings",
  "crm": "dashboard.myClients",
  "marketplace": "dashboard.marketplace",
  "training": "dashboard.training",
  "training-mgmt": "dashboard.training",
  "esg": "dashboard.esgCarbon",
  "compliance": "dashboard.compliance",
  "cleanup": "dashboard.cleanupExercise",
  "pricing": "dashboard.livePricing",
  "analytics": "dashboard.analytics",
  "digital-id": "dashboard.digitalId",
  "grants": "dashboard.grantsPrograms",
  "team": "dashboard.myTeam",
  "trash": "dashboard.trash",
  "settings": "dashboard.profileSettings",
  "profile-settings": "dashboard.profileSettings",

  // Aggregator
  "inventory": "dashboard.inventory",
  "pickers": "dashboard.wastePickerMgmt",
  "logistics": "dashboard.logistics",
  "payments": "dashboard.payments",
  "invoices": "dashboard.invoices",
  "bulk-receipts": "dashboard.bulkReceipts",
  "profit-analytics": "dashboard.profitAnalytics",
  "waste-delivered": "dashboard.wasteDelivered",
  "recycler-pickup": "dashboard.recyclerPickup",
  "suppliers": "dashboard.suppliers",

  // Recycler
  "products": "dashboard.productCatalog",
  "transformation": "dashboard.materialTransform",
  "market": "dashboard.marketInsights",
  "forecast": "dashboard.supplyForecast",
  "business-insights": "dashboard.profitAnalytics",

  // Corporate
  "footprint": "dashboard.plasticFootprint",
  "commitment": "dashboard.recoveryCommitment",
  "tracking": "dashboard.recoveryTracking",
  "epr": "dashboard.eprCompliance",
  "offset": "dashboard.plasticOffset",
  "certificates": "dashboard.impactCertificates",

  // NGO
  "sponsorship": "dashboard.sponsorship",
  "impact": "dashboard.impactMetrics",
  "reports": "dashboard.reports",

  // County
  "waste-flow": "dashboard.wasteFlow",
  "regulatory": "dashboard.regulatory",

  // Admin
  "revenue": "dashboard.revenueInsights",
  "billing": "dashboard.billing",
  "users": "dashboard.userVerification",
  "view-dashboards": "dashboard.viewUserDashboard",
  "invite": "dashboard.inviteUsers",
  "transactions": "dashboard.transactionTracking",
  "fraud": "dashboard.fraudDetection",
  "audit": "dashboard.auditLogs",
  "county-flow": "dashboard.countyWasteFlow",
  "visibility": "dashboard.userVisibility",
  "forms": "dashboard.formBuilder",
  "messages": "dashboard.contactMessages",
};

export function useTranslatedNavItems(
  navItems: Array<{ id: string; label: string; icon: React.ElementType }>
) {
  const { t } = useTranslation();

  return useMemo(
    () =>
      navItems.map((item) => {
        const key = labelKeyMap[item.id];
        return {
          ...item,
          label: key ? t(key) : item.label,
        };
      }),
    [navItems, t]
  );
}
