import { useAuth } from "@/hooks/use-auth";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";

export function PlanExpirationNotification() {
  // Cancelled by user request: Do not show the Day 20 payment reminder anymore.
  return null;
}
