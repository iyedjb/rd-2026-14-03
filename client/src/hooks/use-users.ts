import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["/api/users"],
  });
}
