export const TRANSPORT_TYPES = {
  bicycle: {
    value: "bicycle",
    label: "Bicycle",
    shortLabel: "Bicycle",
  },
  motorcycle: {
    value: "motorcycle",
    label: "Motorcycle",
    shortLabel: "Motorcycle",
  },
  car: {
    value: "car",
    label: "Car",
    shortLabel: "Car",
  },
  van: {
    value: "van",
    label: "Van",
    shortLabel: "Van",
  },
  truck: {
    value: "truck",
    label: "Truck",
    shortLabel: "Truck",
  },
} as const;

export type TransportTypeKey = keyof typeof TRANSPORT_TYPES;

export const TRANSPORT_TYPE_OPTIONS = Object.values(TRANSPORT_TYPES);

export const LOAD_CAPACITIES = {
  small: {
    value: "small",
    label: "Small (1-5 items)",
    shortLabel: "Small",
    description: "Up to 5kg",
  },
  medium: {
    value: "medium",
    label: "Medium (5-15 items)",
    shortLabel: "Medium",
    description: "5-20kg",
  },
  large: {
    value: "large",
    label: "Large (15-30 items)",
    shortLabel: "Large",
    description: "20-50kg",
  },
  xlarge: {
    value: "xlarge",
    label: "Extra Large (30+ items)",
    shortLabel: "Extra Large",
    description: "50kg+",
  },
} as const;

export type LoadCapacityKey = keyof typeof LOAD_CAPACITIES;

export const LOAD_CAPACITY_OPTIONS = Object.values(LOAD_CAPACITIES);

export const APPROVAL_STATUSES = {
  pending: {
    value: "pending",
    label: "Pending",
    badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
  approved: {
    value: "approved",
    label: "Approved",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  rejected: {
    value: "rejected",
    label: "Rejected",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
} as const;

export type ApprovalStatusKey = keyof typeof APPROVAL_STATUSES;

function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
}

export function getTransportTypeLabel(value: string | null | undefined): string {
  if (!value) return "Not specified";
  const transport = TRANSPORT_TYPES[value as TransportTypeKey];
  return transport?.label || toTitleCase(value);
}

export function getTransportTypeShortLabel(value: string | null | undefined): string {
  if (!value) return "Transport";
  const transport = TRANSPORT_TYPES[value as TransportTypeKey];
  return transport?.shortLabel || toTitleCase(value);
}

export function getLoadCapacityLabel(value: string | null | undefined): string {
  if (!value) return "Not specified";
  const capacity = LOAD_CAPACITIES[value as LoadCapacityKey];
  return capacity?.label || toTitleCase(value);
}

export function getLoadCapacityShortLabel(value: string | null | undefined): string {
  if (!value) return "Capacity";
  const capacity = LOAD_CAPACITIES[value as LoadCapacityKey];
  return capacity?.shortLabel || toTitleCase(value);
}

export function getApprovalStatusLabel(value: string | null | undefined): string {
  if (!value) return "Unknown";
  const status = APPROVAL_STATUSES[value as ApprovalStatusKey];
  return status?.label || value.charAt(0).toUpperCase() + value.slice(1);
}

export function getApprovalStatusBadgeClass(value: string | null | undefined): string {
  if (!value) return "";
  const status = APPROVAL_STATUSES[value as ApprovalStatusKey];
  return status?.badgeClass || "";
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return "Not specified";
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "Not specified";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
