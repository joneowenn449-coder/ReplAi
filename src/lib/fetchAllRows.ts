import { apiRequest } from "@/lib/api";

export async function fetchAllRows(table: string, _select: string = "*") {
  return apiRequest(`/api/export/${table}`);
}
