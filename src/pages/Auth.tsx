import { useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2, Mail, Lock, User, Camera, ShoppingBag,
  Coins, BarChart3, ArrowRight, Plug, Bot, Eye,
  ChevronDown
} from "lucide-react";

const Auth = () => {
  const { user, loading: authLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  if (!authLoading && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: displayName },
          },
        });
        if (error) throw error;
        toast.success("Регистрация успешна!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      toast.error(error.message || "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const features = [
    {
      icon: Camera,
      title: "ИИ, который не стыдно оставить без присмотра",
      description:
        'Понимает контекст фото и текста. Не отвечает "спасибо" на фото разбитой вазы.',
      accent: "bg-primary/10 text-primary",
    },
    {
      icon: ShoppingBag,
      title: "Умные допродажи (RAG)",
      description:
        "Рекомендуем товары, подходящие по смыслу и наличию на складе, а не случайные артикулы.",
      accent: "bg-secondary text-green-600 dark:text-green-400",
    },
    {
      icon: Coins,
      title: "Честная оплата без сгорания",
      description:
        "Купили токены — они ваши навсегда. Нет подписки, нет скрытых платежей.",
      accent: "bg-secondary text-amber-600 dark:text-amber-400",
    },
    {
      icon: BarChart3,
      title: "AI-Аналитик: Знает, почему упали продажи",
      description:
        'Не просто графики, а советы: "В партии платьев от 5 мая жалуются на швы".',
      accent: "bg-secondary text-blue-600 dark:text-blue-400",
    },
  ];

  const steps = [
    {
      num: "01",
      icon: Plug,
      title: "Подключите кабинет",
      description: "Вставьте API-ключ Wildberries — и все отзывы уже у вас.",
    },
    {
      num: "02",
      icon: Bot,
      title: "ИИ отвечает за вас",
      description:
        "Авто-ответы на положительные, черновики на сложные — вы решаете.",
    },
    {
      num: "03",
      icon: Eye,
      title: "Контролируйте результат",
      description:
        "Статистика, аналитика и Telegram-бот — всё под рукой, 24/7.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
              <path
                d="M10 12C10 10.8954 10.8954 10 12 10H16C18.2091 10 20 11.7909 20 14C20 16.2091 18.2091 18 16 18H13V22H10V12ZM13 15H16C16.5523 15 17 14.5523 17 14C17 13.4477 16.5523 13 16 13H13V15Z"
                fill="white"
              />
              <path
                d="M16 16L21 22"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-xl font-bold tracking-tight">
              Repl<span className="text-primary">Ai</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              data-testid="button-header-login"
              onClick={() => {
                setIsSignUp(false);
                scrollToForm();
              }}
            >
              Войти
            </Button>
            <Button
              size="sm"
              data-testid="button-header-signup"
              onClick={() => {
                setIsSignUp(true);
                scrollToForm();
              }}
            >
              Попробовать бесплатно
            </Button>
          </div>
        </div>
      </header>

      <section className="pt-28 pb-16 md:pt-36 md:pb-24 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Bot className="w-4 h-4 text-primary" />
            Для продавцов Wildberries
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight" data-testid="text-hero-title">
            ИИ-ответы на отзывы,{" "}
            <span className="text-primary">которым можно доверять</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed" data-testid="text-hero-subtitle">
            Автоматические ответы с пониманием фото и контекста, умные
            допродажи и аналитика — всё в одном сервисе.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              data-testid="button-hero-cta"
              onClick={() => {
                setIsSignUp(true);
                scrollToForm();
              }}
            >
              Начать бесплатно
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <span className="text-sm text-muted-foreground">
              10 токенов в подарок при регистрации
            </span>
          </div>
          <button
            onClick={scrollToForm}
            className="mt-8 mx-auto flex flex-col items-center gap-1 text-muted-foreground/60"
            data-testid="button-scroll-down"
          >
            <span className="text-xs">Подробнее</span>
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </button>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4 bg-card/50">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-features-title">
              Почему продавцы выбирают ReplAi
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Четыре причины перестать отвечать на отзывы вручную
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
            {features.map((f) => (
              <Card key={f.title} data-testid={`card-feature-${f.title.slice(0, 10)}`}>
                <CardContent className="p-5 md:p-6 space-y-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${f.accent}`}
                  >
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-base md:text-lg leading-snug">
                    {f.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-steps-title">
              Как это работает
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Три шага — и ИИ работает на вас
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {steps.map((s) => (
              <div key={s.num} className="text-center space-y-4" data-testid={`step-${s.num}`}>
                <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <s.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs font-mono text-primary/60 uppercase tracking-widest">
                  Шаг {s.num}
                </span>
                <h3 className="font-semibold text-base">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={formRef}
        className="py-16 md:py-24 px-4 bg-card/50"
        id="auth-form"
      >
        <div className="max-w-sm mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              {isSignUp ? "Создайте аккаунт" : "Войдите в аккаунт"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignUp
                ? "Начните управлять отзывами с помощью ИИ"
                : "Рады видеть вас снова"}
            </p>
          </div>

          <Card>
            <CardContent className="p-5 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Имя"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-10"
                      data-testid="input-name"
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                    data-testid="input-email"
                    autoComplete="email"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10"
                    data-testid="input-password"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  data-testid="button-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isSignUp ? "Регистрация..." : "Вход..."}
                    </>
                  ) : isSignUp ? (
                    "Зарегистрироваться"
                  ) : (
                    "Войти"
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-primary underline-offset-4 underline"
                  data-testid="button-toggle-auth"
                >
                  {isSignUp
                    ? "Уже есть аккаунт? Войти"
                    : "Нет аккаунта? Зарегистрироваться"}
                </button>
              </div>

              {isSignUp && (
                <p className="mt-3 text-xs text-muted-foreground text-center">
                  При регистрации вы получите 10 бесплатных токенов для ответов
                  на отзывы
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
              <path
                d="M10 12C10 10.8954 10.8954 10 12 10H16C18.2091 10 20 11.7909 20 14C20 16.2091 18.2091 18 16 18H13V22H10V12ZM13 15H16C16.5523 15 17 14.5523 17 14C17 13.4477 16.5523 13 16 13H13V15Z"
                fill="white"
              />
              <path
                d="M16 16L21 22"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="font-medium text-foreground">
              Repl<span className="text-primary">Ai</span>
            </span>
          </div>
          <span data-testid="text-footer-tagline">ИИ-ответы на отзывы Wildberries</span>
        </div>
      </footer>
    </div>
  );
};

export default Auth;
