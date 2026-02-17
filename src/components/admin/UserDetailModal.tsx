import { useState, useEffect } from "react";
import {
  useUpdateBalance,
  useUpdateAiBalance,
  useUpdateAdminNotes,
  useDeleteUser,
  type AdminUser,
} from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Coins, BrainCircuit, Plus, Minus, Loader2, MessageCircle,
  Trash2, Save, Store, CreditCard, StickyNote, Clock,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface UserDetailModalProps {
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
}

type BalanceTarget = "token" | "ai";

const statusConfig: Record<AdminUser["status"], { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 no-default-hover-elevate",
  },
  trial: {
    label: "Trial",
    className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20 no-default-hover-elevate",
  },
  expired: {
    label: "Expired",
    className: "no-default-hover-elevate",
  },
};

export const UserDetailModal = ({ user, open, onClose }: UserDetailModalProps) => {
  const { user: currentUser } = useAuth();
  const updateBalance = useUpdateBalance();
  const updateAiBalance = useUpdateAiBalance();
  const updateAdminNotes = useUpdateAdminNotes();
  const deleteUser = useDeleteUser();

  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceDesc, setBalanceDesc] = useState("");
  const [balanceTarget, setBalanceTarget] = useState<BalanceTarget>("token");
  const [balanceAction, setBalanceAction] = useState<"admin_topup" | "admin_deduct">("admin_topup");
  const [showBalanceForm, setShowBalanceForm] = useState(false);

  const [notes, setNotes] = useState(user?.admin_notes || "");
  const [notesChanged, setNotesChanged] = useState(false);

  useEffect(() => {
    if (user) {
      setNotes(user.admin_notes || "");
      setNotesChanged(false);
    }
  }, [user?.id, user?.admin_notes]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setShowBalanceForm(false);
      setShowDeleteConfirm(false);
      setBalanceAmount("");
      setBalanceDesc("");
      setNotesChanged(false);
      onClose();
    }
  };

  const handleBalanceSubmit = () => {
    if (!user || !balanceAmount || Number(balanceAmount) <= 0) return;
    const mutation = balanceTarget === "ai" ? updateAiBalance : updateBalance;
    mutation.mutate(
      {
        userId: user.id,
        amount: Number(balanceAmount),
        type: balanceAction,
        description: balanceDesc || undefined,
      },
      {
        onSuccess: () => {
          setShowBalanceForm(false);
          setBalanceAmount("");
          setBalanceDesc("");
        },
      }
    );
  };

  const handleNoteSave = () => {
    if (!user) return;
    updateAdminNotes.mutate(
      { userId: user.id, notes },
      { onSuccess: () => setNotesChanged(false) }
    );
  };

  const handleDelete = () => {
    if (!user) return;
    deleteUser.mutate(user.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onClose();
      },
    });
  };

  if (!user) return null;

  const sc = statusConfig[user.status];
  const userName = user.display_name || user.email || user.id.slice(0, 8);
  const balanceMutation = balanceTarget === "ai" ? updateAiBalance : updateBalance;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap" data-testid="text-detail-title">
            <span>{userName}</span>
            <Badge variant="outline" className={sc.className} data-testid="badge-detail-status">
              {sc.label}
            </Badge>
            {user.role === "admin" && (
              <Badge variant="default" className="no-default-hover-elevate" data-testid="badge-detail-role">admin</Badge>
            )}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs" data-testid="text-detail-id">
            {user.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Email</span>
              <p className="font-medium text-foreground" data-testid="text-detail-email">{user.email || "\u2014"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Телефон</span>
              <p className="font-medium text-foreground" data-testid="text-detail-phone">{user.phone || "\u2014"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Регистрация</span>
              <p className="font-medium text-foreground" data-testid="text-detail-registration">
                {format(new Date(user.created_at), "dd MMM yyyy, HH:mm", { locale: ru })}
              </p>
            </div>
            <div className="flex items-start gap-1.5">
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Последняя активность
                </span>
                <p className="font-medium text-foreground" data-testid="text-detail-last-seen">
                  {user.last_seen_at
                    ? formatDistanceToNow(new Date(user.last_seen_at), { addSuffix: true, locale: ru })
                    : "\u2014"}
                </p>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <Store className="w-3.5 h-3.5" />
                Кабинеты WB
              </span>
              <p className="font-medium text-foreground" data-testid="text-detail-cabinets">{user.cabinetsCount}</p>
            </div>
            {user.telegram && (
              <div>
                <span className="text-muted-foreground flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Telegram
                </span>
                <p className="font-medium text-foreground" data-testid="text-detail-telegram">
                  {user.telegram.username ? (
                    <a
                      href={`https://t.me/${user.telegram.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500"
                    >
                      @{user.telegram.username}
                    </a>
                  ) : (
                    user.telegram.firstName || "Подключён"
                  )}
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Балансы
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-xs text-muted-foreground">Токены</p>
                    <p className="text-xl font-bold text-foreground" data-testid="text-detail-tokens">{user.balance}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setBalanceTarget("token");
                        setBalanceAction("admin_topup");
                        setShowBalanceForm(true);
                      }}
                      data-testid="button-detail-topup-tokens"
                    >
                      <Plus className="w-4 h-4 text-emerald-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setBalanceTarget("token");
                        setBalanceAction("admin_deduct");
                        setShowBalanceForm(true);
                      }}
                      data-testid="button-detail-deduct-tokens"
                    >
                      <Minus className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-xs text-muted-foreground">AI запросы</p>
                    <p className="text-xl font-bold text-foreground" data-testid="text-detail-ai">{user.aiBalance}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setBalanceTarget("ai");
                        setBalanceAction("admin_topup");
                        setShowBalanceForm(true);
                      }}
                      data-testid="button-detail-topup-ai"
                    >
                      <Plus className="w-4 h-4 text-emerald-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setBalanceTarget("ai");
                        setBalanceAction("admin_deduct");
                        setShowBalanceForm(true);
                      }}
                      data-testid="button-detail-deduct-ai"
                    >
                      <Minus className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {showBalanceForm && (
              <div className="mt-3 rounded-lg border border-border p-3 space-y-3">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  {balanceTarget === "ai" ? <BrainCircuit className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
                  {balanceAction === "admin_topup" ? "Пополнить" : "Списать"}{" "}
                  {balanceTarget === "ai" ? "AI запросы" : "токены"}
                </p>
                <Input
                  type="number"
                  min={1}
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="Количество"
                  data-testid="input-balance-amount"
                />
                <Input
                  value={balanceDesc}
                  onChange={(e) => setBalanceDesc(e.target.value)}
                  placeholder="Описание (необязательно)"
                  data-testid="input-balance-desc"
                />
                <div className="flex items-center justify-end gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setShowBalanceForm(false)} data-testid="button-balance-cancel">
                    Отмена
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBalanceSubmit}
                    disabled={!balanceAmount || Number(balanceAmount) <= 0 || balanceMutation.isPending}
                    data-testid="button-balance-submit"
                  >
                    {balanceMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                    {balanceAction === "admin_topup" ? "Пополнить" : "Списать"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              История платежей
              {user.paymentsCount > 0 && (
                <span className="text-muted-foreground font-normal">
                  ({user.paymentsCount} оплат на {user.totalPaid.toLocaleString("ru-RU")} \u20BD)
                </span>
              )}
            </h3>
            {user.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-payments">Платежей нет</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {user.payments.map((pay) => {
                  const payStatus = pay.status === "completed" ? "Оплачен" : pay.status === "pending" ? "Ожидание" : pay.status;
                  const payStatusClass =
                    pay.status === "completed"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
                  return (
                    <div
                      key={pay.id}
                      className="flex items-center justify-between gap-2 flex-wrap rounded-md border border-border px-3 py-2 text-sm"
                      data-testid={`row-payment-${pay.id}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{Number(pay.amount).toLocaleString("ru-RU")} \u20BD</span>
                        <span className="text-muted-foreground">{pay.tokens} токенов</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`${payStatusClass} no-default-hover-elevate`}>
                          {payStatus}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(pay.created_at), "dd.MM.yyyy HH:mm", { locale: ru })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <StickyNote className="w-4 h-4" />
              Заметки администратора
            </h3>
            <Textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesChanged(true);
              }}
              placeholder="Заметки о пользователе..."
              className="resize-none text-sm"
              rows={3}
              data-testid="textarea-admin-notes"
            />
            {notesChanged && (
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  onClick={handleNoteSave}
                  disabled={updateAdminNotes.isPending}
                  data-testid="button-save-notes"
                >
                  {updateAdminNotes.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <Save className="w-4 h-4 mr-1.5" />
                  )}
                  Сохранить
                </Button>
              </div>
            )}
          </div>

          {user.id !== currentUser?.id && (
            <>
              <Separator />
              <div>
                {!showDeleteConfirm ? (
                  <Button
                    variant="outline"
                    className="text-destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    data-testid="button-detail-delete"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Удалить пользователя
                  </Button>
                ) : (
                  <div className="rounded-lg border border-destructive/30 p-3 space-y-3">
                    <p className="text-sm text-destructive font-medium">
                      Все данные пользователя будут безвозвратно удалены.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                        data-testid="button-detail-cancel-delete"
                      >
                        Отмена
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleteUser.isPending}
                        data-testid="button-detail-confirm-delete"
                      >
                        {deleteUser.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                        Подтвердить удаление
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
