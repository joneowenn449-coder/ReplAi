import { useState } from "react";
import { useAdminUsers, useUpdateBalance } from "@/hooks/useAdmin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Minus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export const UsersTable = () => {
  const { data: users, isLoading } = useAdminUsers();
  const updateBalance = useUpdateBalance();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [actionType, setActionType] = useState<"admin_topup" | "admin_deduct">("admin_topup");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const openDialog = (userId: string, userName: string, type: "admin_topup" | "admin_deduct") => {
    setSelectedUser({ id: userId, name: userName });
    setActionType(type);
    setAmount("");
    setDescription("");
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedUser || !amount || Number(amount) <= 0) return;
    updateBalance.mutate(
      {
        userId: selectedUser.id,
        amount: Number(amount),
        type: actionType,
        description: description || undefined,
      },
      { onSuccess: () => setDialogOpen(false) }
    );
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
    <>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Пользователь</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Регистрация</TableHead>
              <TableHead className="text-right">Баланс</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Нет пользователей
                </TableCell>
              </TableRow>
            )}
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">
                      {user.display_name || "Без имени"}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.id.slice(0, 8)}...</p>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.phone || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(user.created_at), "dd MMM yyyy", { locale: ru })}
                </TableCell>
                <TableCell className="text-right font-semibold">{user.balance}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        openDialog(user.id, user.display_name || user.id.slice(0, 8), "admin_topup")
                      }
                      title="Пополнить"
                    >
                      <Plus className="w-4 h-4 text-success" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        openDialog(user.id, user.display_name || user.id.slice(0, 8), "admin_deduct")
                      }
                      title="Списать"
                    >
                      <Minus className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "admin_topup" ? "Пополнить баланс" : "Списать токены"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Пользователь: <span className="font-medium text-foreground">{selectedUser?.name}</span>
            </p>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Количество токенов</label>
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Описание (необязательно)</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Причина пополнения/списания"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!amount || Number(amount) <= 0 || updateBalance.isPending}
            >
              {updateBalance.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {actionType === "admin_topup" ? "Пополнить" : "Списать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
