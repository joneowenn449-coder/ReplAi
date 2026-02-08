import { useState } from "react";
import { useAdminTransactions } from "@/hooks/useAdmin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

const typeLabels: Record<string, string> = {
  bonus: "Бонус",
  deduct: "Списание",
  purchase: "Покупка",
  admin_topup: "Пополнение (админ)",
  admin_deduct: "Списание (админ)",
};

const typeColors: Record<string, string> = {
  bonus: "default",
  deduct: "destructive",
  purchase: "default",
  admin_topup: "default",
  admin_deduct: "destructive",
};

export const TransactionsTable = () => {
  const [typeFilter, setTypeFilter] = useState("all");
  const { data: transactions, isLoading } = useAdminTransactions(typeFilter);

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
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground">Тип:</label>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="bonus">Бонус</SelectItem>
            <SelectItem value="deduct">Списание</SelectItem>
            <SelectItem value="purchase">Покупка</SelectItem>
            <SelectItem value="admin_topup">Пополнение (админ)</SelectItem>
            <SelectItem value="admin_deduct">Списание (админ)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
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
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {tx.user_id.slice(0, 8)}...
                </TableCell>
                <TableCell>
                  <Badge variant={(typeColors[tx.type] as "default" | "destructive") || "secondary"}>
                    {typeLabels[tx.type] || tx.type}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right font-semibold ${tx.amount > 0 ? "text-success" : "text-destructive"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                  {tx.description || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(tx.created_at), "dd MMM yyyy, HH:mm", { locale: ru })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
