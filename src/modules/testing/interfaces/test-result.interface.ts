export interface DetailedTestLog {
  timestamp: string;
  phase: string;
  module: string;
  endpoint: string;
  method: string;
  url: string;
  auth?: {
    role: string;
    userId?: string;
  };
  request?: {
    body?: any;
    query?: any;
    params?: any;
  };
  response: {
    statusCode: number;
    body?: any;
    duration: number;
  };
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
  contextData?: Record<string, any>;
}

export interface TestResult {
  module: string;
  endpoint: string;
  method: string;
  status: 'passed' | 'failed' | 'skipped';
  statusCode?: number;
  duration: number;
  error?: string;
}

export interface PhaseResult {
  phase: string;
  endpoints: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: string;
}

export interface ModuleStats {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface CleanupResult {
  profiles: number;
  products: number;
  campaigns: number;
  procedures: number;
  steps: number;
  distributions: number;
  sessions: number;
  messages: number;
  notifications: number;
  total: number;
}

export interface TestSummary {
  success: boolean;
  duration: string;
  timestamp: string;
  summary: {
    totalEndpoints: number;
    tested: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  phases: PhaseResult[];
  byModule: Record<string, ModuleStats>;
  failures: Array<{
    endpoint: string;
    method: string;
    error: string;
    details?: any;
  }>;
  detailedLogs: DetailedTestLog[];
  cleanup: CleanupResult;
}

export interface TestContext {
  // Tokens
  tokenUser?: string;
  tokenPro?: string;
  tokenAdmin?: string;

  // User IDs
  userUserId?: string;
  userProId?: string;
  userAdminId?: string;

  // User emails for cleanup
  emailUser?: string;
  emailPro?: string;
  emailAdmin?: string;

  // Created entities IDs
  productId?: string;
  productIds?: string[];
  campaignId?: string;
  campaignIds?: string[];
  procedureId?: string;
  procedureIds?: string[];
  stepId?: string;
  stepIds?: string[];
  distributionIds?: string[];
  sessionId?: string;
  sessionIds?: string[];
  messageIds?: string[];
  notificationIds?: string[];
}
