import { Pill, ClipboardList, AlertTriangle, CalendarClock } from "lucide-react";

export const STATS = [
  { label: "Total Medicines", value: "18,942", change: "+22.4%", trend: "up", icon: Pill },
  { label: "Active Prescriptions", value: "247", change: "+18 today", trend: "up", icon: ClipboardList },
  { label: "Low Stock Items", value: "12", change: "Reorder", trend: "warn", icon: AlertTriangle },
  { label: "Expiring This Month", value: "8", change: "Check now", trend: "warn", icon: CalendarClock },
];
