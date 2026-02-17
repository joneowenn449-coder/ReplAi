import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, Star, MessageSquare, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Review } from "@/hooks/useReviews";
import { useDashboardData, DashboardFilters } from "@/hooks/useDashboardData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface DashboardSectionProps {
  reviews: Review[];
  isLoading: boolean;
}

const RATING_COLORS: Record<number, string> = {
  1: "hsl(0 84% 60%)",
  2: "hsl(25 95% 53%)",
  3: "hsl(38 92% 50%)",
  4: "hsl(142 60% 50%)",
  5: "hsl(142 76% 36%)",
};

export const DashboardSection = ({ reviews, isLoading }: DashboardSectionProps) => {
  const [filters, setFilters] = useState<DashboardFilters>({
    dateFrom: undefined,
    dateTo: undefined,
    articles: [],
    ratings: [],
  });

  const data = useDashboardData(reviews, filters);

  const toggleRating = (r: number) => {
    setFilters((prev) => ({
      ...prev,
      ratings: prev.ratings.includes(r) ? prev.ratings.filter((x) => x !== r) : [...prev.ratings, r],
    }));
  };

  const toggleArticle = (a: string) => {
    setFilters((prev) => ({
      ...prev,
      articles: prev.articles.includes(a) ? prev.articles.filter((x) => x !== a) : [...prev.articles, a],
    }));
  };

  const clearFilters = () => {
    setFilters({ dateFrom: undefined, dateTo: undefined, articles: [], ratings: [] });
  };

  const hasFilters = filters.dateFrom || filters.dateTo || filters.articles.length > 0 || filters.ratings.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const chartData = data.reviewsByDay.map((d) => ({
    ...d,
    label: format(new Date(d.date), "d MMM", { locale: ru }),
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Date from */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 gap-1.5", filters.dateFrom && "border-primary text-primary")}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {filters.dateFrom ? format(filters.dateFrom, "d MMM yyyy", { locale: ru }) : "Дата от"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(d) => setFilters((f) => ({ ...f, dateFrom: d }))}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Date to */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 gap-1.5", filters.dateTo && "border-primary text-primary")}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {filters.dateTo ? format(filters.dateTo, "d MMM yyyy", { locale: ru }) : "Дата до"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={(d) => setFilters((f) => ({ ...f, dateTo: d }))}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Rating filter */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((r) => (
                <Button
                  key={r}
                  variant={filters.ratings.includes(r) ? "default" : "outline"}
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => toggleRating(r)}
                >
                  {r}★
                </Button>
              ))}
            </div>

            {/* Article filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9", filters.articles.length > 0 && "border-primary text-primary")}>
                  Артикулы {filters.articles.length > 0 && `(${filters.articles.length})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 max-h-60 overflow-y-auto p-2" align="start">
                {data.uniqueArticles.map((a) => (
                  <button
                    key={a}
                    onClick={() => toggleArticle(a)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded text-sm transition-colors",
                      filters.articles.includes(a) ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                    )}
                  >
                    {a}
                  </button>
                ))}
                {data.uniqueArticles.length === 0 && (
                  <p className="text-sm text-muted-foreground px-3 py-2">Нет артикулов</p>
                )}
              </PopoverContent>
            </Popover>

            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearFilters}>
                Сбросить
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="pt-3 sm:pt-5 pb-3 sm:pb-4 px-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-secondary">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{data.totalReviews}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Всего отзывов</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 sm:pt-5 pb-3 sm:pb-4 px-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-secondary">
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-warning" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{data.avgRating}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Средний рейтинг</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 sm:pt-5 pb-3 sm:pb-4 px-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-secondary">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-warning" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{data.pendingCount}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Ожидают ответа</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 sm:pt-5 pb-3 sm:pb-4 px-3 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-secondary">
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold">{data.answeredCount}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Отвечено</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Reviews by day */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Отзывы по дням</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="count" name="Отзывы" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Нет данных для отображения</p>
            )}
          </CardContent>
        </Card>

        {/* Rating distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Распределение рейтингов</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.ratingDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  dataKey="rating"
                  type="category"
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `${v}★`}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                  formatter={(value: number, _name: string, props: any) => [
                    `${value} (${props.payload.percent}%)`,
                    "Отзывы",
                  ]}
                />
                <Bar dataKey="count" name="Отзывы" radius={[0, 4, 4, 0]}>
                  {data.ratingDistribution.map((entry) => (
                    <Cell key={entry.rating} fill={RATING_COLORS[entry.rating]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top articles table */}
      {data.topArticles.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Топ артикулов</CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Артикул</TableHead>
                    <TableHead>Товар</TableHead>
                    <TableHead className="text-right">Отзывы</TableHead>
                    <TableHead className="text-right">Ср. рейтинг</TableHead>
                    <TableHead className="text-right">% негативных</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topArticles.slice(0, 20).map((a) => (
                    <TableRow key={a.article}>
                      <TableCell className="font-mono text-xs sm:text-sm whitespace-nowrap">{a.article}</TableCell>
                      <TableCell className="max-w-[140px] sm:max-w-[200px] truncate text-xs sm:text-sm">{a.productName}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">{a.count}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">{a.avgRating}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">
                        <span className={cn(a.negativePercent > 30 ? "text-destructive font-semibold" : "")}>
                          {a.negativePercent}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
