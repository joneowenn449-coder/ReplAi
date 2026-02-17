import { useState } from "react";
import { useAdminTransactions, useAdminAiTransactions } from "@/hooks/useAdmin";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const baseTypeLabels: Record<string, string> = {
  bonus: "Бонус",
  purchase: "Покупка",
  admin_topup: "Пополнение (админ)",
  admin_deduct: "Списание (админ)",
};

const tokenTypeLabels: Record<string, string> = { ...baseTypeLabels, deduct: "Списание" };
const aiTypeLabels: Record<string, string> = { ...baseTypeLabels, usage: "Использование" };

const typeColors: Record<string, string> = {
  bonus: "default",
  deduct: "destructive",
  usage: "destructive",
  purchase: "default",
  admin_topup: "default",
  admin_deduct: "destructive",
};

export const TransactionsTable = () => {
  const [tab, setTab] = useState<"tokens" | "ai">("tokens");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: tokenTx, isLoading: tokenLoading } = useAdminTransactions(tab === "tokens" ? typeFilter : undefined);
  const { data: aiTx, isLoading: aiLoading } = useAdminAiTransactions(tab === "ai" ? typeFilter : undefined);

  const transactions = tab === "tokens" ? tokenTx : aiTx;
  const isLoading = tab === "tokens" ? tokenLoading : aiLoading;
  const labels = tab === "tokens" ? tokenTypeLabels : aiTypeLabels;

  const baseFilterOptions = [
    { value: "all", label: "Все" },
    { value: "bonus", label: "Бонус" },
  ];
  const sharedSuffix = [
    { value: "purchase", label: "Покупка" },
    { value: "admin_topup", label: "Пополнение (админ)" },
    { value: "admin_deduct", label: "Списание (админ)" },
  ];
  const filterOptions = tab === "tokens"
    ? [...baseFilterOptions, { value: "deduct", label: "Списание" }, ...sharedSuffix]
    : [...baseFilterOptions, { value: "usage", label: "Использование" }, ...sharedSuffix];

  const handleTabChange = (v: string) => {
    setTab(v as "tokens" | "ai");
    setTypeFilter("all");
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="tokens">Токены</TabsTrigger>
            <TabsTrigger value="ai">AI запросы</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">Тип:</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead>Описание</TableHead>
                <TableHead>Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Нет транзакций
                  </TableCell>
                </TableRow>
              )}
              {transactions?.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {tx.user_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <Badge variant={(typeColors[tx.type] as "default" | "destructive") || "secondary"}>
                      {labels[tx.type] || tx.type}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-semibold whitespace-nowrap ${tx.amount > 0 ? "text-success" : "text-destructive"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[140px] sm:max-w-[200px] truncate">
                    {tx.description || "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {format(new Date(tx.created_at), "dd MMM yyyy, HH:mm", { locale: ru })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
