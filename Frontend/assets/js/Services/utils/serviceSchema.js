// assets/js/Services/utils/serviceSchema.js

export const serviceDefaults = {
  id: "",
  clientId: "",
  reference: "",
  startDate: "",
  endDate: "",
  referredBy: "",
  insurance: "",
  serviceType: "",
  setupFee: "",
  setupBudget: 0,
  monthlyFee: 0,
  initialFee: 0,
  pensionFee: 0,
  pensionSetup: 0,
  annualFee: 0,
  yearEndFee: 0,
  carerBudget: 0,
  agencyBudget: 0,
  carers: [],
  agency: [],
  pa: [],
  optional: [],
  notes: "",
  statements: [],
};

export const referredByOptions = [
  "Adult",
  "Child",
  "Private",
  "Self"
];

export const serviceTypeOptions = [
  "DBS",
  "Managed Account Only",
  "Managed Account and Payroll",
  "Payroll Only",
  "PHB/DP Support",
  "Recruitment",
];

export const setupFeeOptions = [
  "Managed Account Setup Cost",
  "Payroll Setup Cost",
  "Managed Account and Payroll Setup Cost",
];
