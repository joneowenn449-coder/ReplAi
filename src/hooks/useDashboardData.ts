import { useMemo } from "react";
import { Review } from "./useReviews";
import { startOfDay, endOfDay, isWithinInterval, parseISO, format } from "date-fns";

export interface DashboardFilters {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  articles: string[];
  ratings: number[];
}

export interface DayData {
  date: string;
  count: number;
}

export interface RatingData {
  rating: number;
  count: number;
  percent: number;
}

export interface ArticleData {
  article: string;
  productName: string;
  count: number;
  avgRating: number;
  negativePercent: number;
}

export interface DashboardData {
  totalReviews: number;
  avgRating: number;
  pendingCount: number;
  answeredCount: number;
  reviewsByDay: DayData[];
  ratingDistribution: RatingData[];
  topArticles: ArticleData[];
  uniqueArticles: string[];
}

export function useDashboardData(reviews: Review[], filters: DashboardFilters): DashboardData {
  return useMemo(() => {
    // Collect unique articles from all reviews (before filtering)
    const uniqueArticles = [...new Set(reviews.map((r) => r.product_article))].sort();

    // Apply filters
    let filtered = reviews;

    if (filters.dateFrom) {
      const from = startOfDay(filters.dateFrom);
      filtered = filtered.filter((r) => parseISO(r.created_date) >= from);
    }
    if (filters.dateTo) {
      const to = endOfDay(filters.dateTo);
      filtered = filtered.filter((r) => parseISO(r.created_date) <= to);
    }
    if (filters.articles.length > 0) {
      filtered = filtered.filter((r) => filters.articles.includes(r.product_article));
    }
    if (filters.ratings.length > 0) {
      filtered = filtered.filter((r) => filters.ratings.includes(r.rating));
    }

    // Stats
    const totalReviews = filtered.length;
    const avgRating = totalReviews > 0
      ? Math.round((filtered.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : 0;
    const pendingCount = filtered.filter((r) => r.status === "pending").length;
    const answeredCount = filtered.filter((r) => r.status === "auto" || r.status === "sent").length;

    // Reviews by day
    const dayMap = new Map<string, number>();
    filtered.forEach((r) => {
      const day = format(parseISO(r.created_date), "yyyy-MM-dd");
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    });
    const reviewsByDay = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Rating distribution
    const ratingMap = new Map<number, number>();
    for (let i = 1; i <= 5; i++) ratingMap.set(i, 0);
    filtered.forEach((r) => ratingMap.set(r.rating, (ratingMap.get(r.rating) || 0) + 1));
    const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: ratingMap.get(rating) || 0,
      percent: totalReviews > 0 ? Math.round(((ratingMap.get(rating) || 0) / totalReviews) * 100) : 0,
    }));

    // Top articles
    const articleMap = new Map<string, { name: string; count: number; ratingSum: number; negative: number }>();
    filtered.forEach((r) => {
      const existing = articleMap.get(r.product_article) || { name: r.product_name, count: 0, ratingSum: 0, negative: 0 };
      existing.count++;
      existing.ratingSum += r.rating;
      if (r.rating <= 2) existing.negative++;
      articleMap.set(r.product_article, existing);
    });
    const topArticles = [...articleMap.entries()]
      .map(([article, d]) => ({
        article,
        productName: d.name,
        count: d.count,
        avgRating: Math.round((d.ratingSum / d.count) * 10) / 10,
        negativePercent: Math.round((d.negative / d.count) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalReviews,
      avgRating,
      pendingCount,
      answeredCount,
      reviewsByDay,
      ratingDistribution,
      topArticles,
      uniqueArticles,
    };
  }, [reviews, filters]);
}
