import { useState, useMemo } from "react";
import { useAdminUsers, useDeleteUser, type AdminUser } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Search, Download, Trash2, Loader2, Eye } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface UsersTableProps {
  onSelectUser: (user: AdminUser) => void;
}

export const UsersTable = ({ onSelectUser }: UsersTableProps) => {
  const { data: users, isLoading } = useAdminUsers();
  const { user: currentUser } = useAuth();
  const deleteUser = useDeleteUser();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const sorted = [...users].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (u) =>
        (u.display_name && u.display_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }, [users, search]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({ title: "ID скопирован" });
  };

  const handleExportCsv = () => {
    if (!filteredUsers.length) return;
    const headers = ["ID", "Email", "Имя", "Статус", "Токены", "AI запросы", "Оплачено", "Регистрация", "Последняя активность"];
    const rows = filteredUsers.map((u) => [
      u.id,
      u.email,
      u.display_name || "",
      u.status,
      String(u.balance),
      String(u.aiBalance),
      String(u.totalPaid),
      format(new Date(u.created_at), "dd.MM.yyyy", { locale: ru }),
      u.last_seen_at
        ? formatDistanceToNow(new Date(u.last_seen_at), { addSuffix: true, locale: ru })
        : "",
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const statusConfig: Record<AdminUser["status"], { label: string; variant: "default" | "secondary" | "outline"; className: string }> = {
    active: {
      label: "Active",
      variant: "default",
      className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 no-default-hover-elevate",
    },
    trial: {
      label: "Trial",
      variant: "secondary",
      className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 no-default-hover-elevate",
    },
    expired: {
      label: "Expired",
      variant: "outline",
      className: "no-default-hover-elevate",
    },
  };

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="users-table-loading">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            data-testid="input-search-users"
            placeholder="Поиск по имени или email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground" data-testid="text-user-count">
            {filteredUsers.length} пользовател{filteredUsers.length === 1 ? "ь" : "ей"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={!filteredUsers.length}
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Экспорт в CSV
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead data-testid="header-id">ID</TableHead>
              <TableHead data-testid="header-name">Имя / Email</TableHead>
              <TableHead data-testid="header-status">Статус</TableHead>
              <TableHead data-testid="header-tariff">Тариф</TableHead>
              <TableHead data-testid="header-registration">Регистрация</TableHead>
              <TableHead data-testid="header-last-activity">Последняя активность</TableHead>
              <TableHead className="text-right" data-testid="header-actions">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  {search ? "Пользователи не найдены" : "Нет пользователей"}
                </TableCell>
              </TableRow>
            )}
            {filteredUsers.map((user) => {
              const sc = statusConfig[user.status];
              return (
                <TableRow
                  key={user.id}
                  className="cursor-pointer"
                  onClick={() => onSelectUser(user)}
                  data-testid={`row-user-${user.id}`}
                >
                  <TableCell>
                    <button
                      type="button"
                      className="font-mono text-xs text-muted-foreground cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyId(user.id);
                      }}
                      title="Нажмите чтобы скопировать полный ID"
                      data-testid={`button-copy-id-${user.id}`}
                    >
                      {user.id.slice(0, 8)}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground text-sm" data-testid={`text-name-${user.id}`}>
                        {user.display_name || user.email || user.id.slice(0, 8)}
                      </p>
                      {user.email && (
                        <p className="text-xs text-muted-foreground" data-testid={`text-email-${user.id}`}>
                          {user.email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={sc.variant}
                      className={sc.className}
                      data-testid={`badge-status-${user.id}`}
                    >
                      {sc.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className="text-sm"
                      data-testid={`text-tariff-${user.id}`}
                    >
                      {user.totalPaid > 0
                        ? `${user.totalPaid.toLocaleString("ru-RU")} \u20BD`
                        : "Бесплатный"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground" data-testid={`text-registration-${user.id}`}>
                      {format(new Date(user.created_at), "dd MMM yyyy", { locale: ru })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground" data-testid={`text-last-activity-${user.id}`}>
                      {user.last_seen_at
                        ? formatDistanceToNow(new Date(user.last_seen_at), {
                            addSuffix: true,
                            locale: ru,
                          })
                        : "\u2014"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end flex-wrap gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectUser(user);
                        }}
                        data-testid={`button-details-${user.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Подробнее
                      </Button>
                      {user.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(user);
                            setDeleteDialogOpen(true);
                          }}
                          data-testid={`button-delete-user-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Удалить пользователя
            </DialogTitle>
            <DialogDescription>
              Все данные пользователя будут безвозвратно удалены: кабинеты, отзывы, чаты, балансы и настройки.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Пользователь:{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.display_name || deleteTarget?.email || deleteTarget?.id.slice(0, 8)}
              </span>
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  deleteUser.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteDialogOpen(false),
                  });
                }
              }}
              disabled={deleteUser.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteUser.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
