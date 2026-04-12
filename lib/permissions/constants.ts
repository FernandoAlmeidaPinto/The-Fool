export const PERMISSIONS = {
  // Readings
  READINGS_VIEW: "readings:view",
  READINGS_CREATE: "readings:create",

  // AI Interpretation
  AI_USE: "ai:use",

  // Courses/Content
  COURSES_ACCESS: "courses:access",

  // Admin
  ADMIN_PROFILES: "admin:profiles",
  ADMIN_PLANS: "admin:plans",
  ADMIN_USERS: "admin:users",
  ADMIN_DECKS: "admin:decks",
  ADMIN_PRACTICE_QUESTIONS: "admin:practice_questions",

  // Daily card
  DAILY_CARD_READ: "daily-card:read",

  // Diary
  DIARY_READ: "diary:read",
  DIARY_WRITE: "diary:write",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);
