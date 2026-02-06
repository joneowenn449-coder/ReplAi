import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSettings, useUpdateSettings } from "@/hooks/useReviews";
import { toast } from "sonner";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (settings?.ai_prompt_template) {
      setPrompt(settings.ai_prompt_template);
    }
  }, [settings?.ai_prompt_template]);

  const handleSave = () => {
    updateSettings.mutate(
      { ai_prompt_template: prompt },
      {
        onSuccess: () => {
          toast.success("Настройки сохранены");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Настройки ИИ-ответов</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Промпт для генерации ответов
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[160px] text-sm"
              placeholder="Опишите, как ИИ должен отвечать на отзывы..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Этот промпт будет использоваться как системная инструкция при генерации ответов на отзывы.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
