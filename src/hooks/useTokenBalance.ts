import { useBalance } from "./useBalance";

export function useTokenBalance() {
  return useBalance("tokens");
}
