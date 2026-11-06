import type {
  ChangeType,
  ReviewStatus,
  Severity,
} from "../types";

export const severityLabels: Record<Severity, string> = {
  critical: "紧急",
  high: "高",
  medium: "中",
  low: "低",
  unassessed: "未评估",
};

export const reviewLabels: Record<ReviewStatus, string> = {
  draft: "待审核",
  approved: "已批准",
  rejected: "已驳回",
  superseded: "已被替代",
};

export const changeTypeLabels: Record<ChangeType, string> = {
  new: "新发布",
  revision: "版本修订",
  amendment: "修正案",
  corrigendum: "勘误",
  supplement: "补充件",
  replacement: "替代",
  repeal: "废止",
  "translation-only": "仅译文变化",
  "status-change": "状态变化",
  draft: "征求意见",
  unknown: "类型未知",
};

export function formatDate(value?: string | null): string {
  if (!value) return "未确认";
  const input = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00+08:00`
    : value;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "未确认";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  }).format(date);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "未确认";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未确认";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(date);
}

export function relativeRunLabel(value?: string | null): string {
  if (!value) return "尚未运行";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未确认";
  const hours = Math.max(0, Math.floor((Date.now() - date.getTime()) / 3_600_000));
  if (hours < 1) return "最近一小时内";
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

export function publicAssetPath(path: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base.endsWith("/") ? base : `${base}/`}${path.replace(/^\/+/, "")}`;
}
