// Default: use Vite proxy (empty string)
// Production: override with VITE_API_URL environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface ApiError {
  error: string;
  message: string;
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('reportcast_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      ...options.headers,
    };

    if (token && !endpoint.startsWith('/listen/')) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.message || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  // Auth endpoints
  async register(email: string, password: string, name: string) {
    return this.request<{
      token: string;
      user: {
        id: string;
        email: string;
        name: string;
        plan: string;
        creditsRemaining: number;
      };
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{
      token: string;
      user: {
        id: string;
        email: string;
        name: string;
        plan: string;
        creditsRemaining: number;
      };
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<{
      id: string;
      email: string;
      name: string;
      plan: string;
      creditsRemaining: number;
      createdAt: string;
    }>('/api/auth/me');
  }

  // Upload & Processing
  async uploadReport(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request<{
      reportId: string;
      filename: string;
      pageCount: number;
      tier: string;
      status: string;
      creditsRequired?: number;
      creditsAvailable?: number;
      hasEnoughCredits?: boolean;
      creditDeficit?: number;
      message: string;
      recommendedPackage?: {
        id: string;
        name: string;
        credits: number;
        price: number;
        priceCents: number;
        priceFormatted: string;
      };
    }>('/api/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async confirmProcessing(
    reportId: string,
    options: { 
      language?: string; 
      tone?: string;
      aiModel?: string;
      ttsVoice?: string;
    } = {}
  ) {
    return this.request<{
      reportId: string;
      status: string;
      message: string;
    }>(`/api/upload/${reportId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({
        language: options.language || 'auto',
        tone: options.tone || 'professional',
        aiModel: options.aiModel,
        ttsVoice: options.ttsVoice,
      }),
    });
  }

  // Reports
  async getReports(limit = 20, offset = 0) {
    return this.request<{
      reports: Array<{
        id: string;
        filename: string;
        pageCount: number;
        tier: string;
        status: string;
        audioUrl?: string;
        createdAt: string;
        completedAt?: string;
      }>;
      pagination: {
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    }>(`/api/reports?limit=${limit}&offset=${offset}`);
  }

  async getReport(reportId: string) {
    return this.request<{
      id: string;
      filename: string;
      pageCount: number;
      tier: string;
      status: string;
      audioUrl?: string;
      audioSize?: number;
      audioDurationSeconds?: number;
      processingTimeMs?: number;
      aiCostCents?: number;
      ttsCostCents?: number;
      errorMessage?: string | null;
      createdAt: string;
      completedAt?: string;
    }>(`/api/reports/${reportId}`);
  }

  async deleteReport(reportId: string) {
    return this.request<{ message: string }>(`/api/reports/${reportId}`, {
      method: 'DELETE',
    });
  }

  getDownloadUrl(reportId: string): string {
    const token = this.getToken();
    return `${API_BASE_URL}/api/reports/${reportId}/download?token=${token}`;
  }

  // Sharing
  async enableSharing(reportId: string) {
    return this.request<{
      shareToken: string;
      shareUrl: string;
      message: string;
    }>(`/api/share/${reportId}`, {
      method: 'POST',
    });
  }

  async disableSharing(reportId: string) {
    return this.request<{ message: string }>(`/api/share/${reportId}`, {
      method: 'DELETE',
    });
  }

  async getShareStats(reportId: string) {
    return this.request<{
      totalListens: number;
      lastListenedAt?: string;
      isPublic: boolean;
      shareToken?: string;
      recentListens: Array<{
        listenedAt: string;
        ipAddress: string;
        country: string;
        city: string;
      }>;
    }>(`/api/share/${reportId}/stats`);
  }

  getListenUrl(shareToken: string): string {
    return `${API_BASE_URL}/listen/${shareToken}`;
  }

  // Pricing
  async getPricing() {
    return this.request<{
      mode: string;
      model: string;
      currency: string;
      creditsPerPage: number;
      freeCredits: number;
      packages: Array<{
        id: string;
        name: string;
        credits: number;
        pages: number;
        price: number;
        priceCents: number;
        priceFormatted: string;
        pricePerCredit: string;
        description: string;
        bestValue: boolean;
      }>;
    }>('/api/pricing');
  }

  async calculatePricing(pages: number) {
    return this.request<{
      pageCount: number;
      creditsRequired: number;
      creditsPerPage: number;
      recommendedPackage: {
        id: string;
        name: string;
        credits: number;
        price: number;
        priceCents: number;
        priceFormatted: string;
      };
      allPackages: Array<{
        id: string;
        name: string;
        credits: number;
        price: number;
        priceCents: number;
        canProcess: boolean;
      }>;
    }>(`/api/pricing/calculate?pages=${pages}`);
  }

  async buyCredits(packageId: string) {
    return this.request<{
      clientSecret: string;
      paymentIntentId: string;
      package: {
        id: string;
        name: string;
        credits: number;
        pages: number;
        price: number;
        priceCents: number;
        priceFormatted: string;
      };
      currency: string;
    }>('/api/payments/buy-credits', {
      method: 'POST',
      body: JSON.stringify({ packageId }),
    });
  }

  // Health check
  async healthCheck() {
    return this.request<{
      status: string;
      timestamp: string;
      database: {
        healthy: boolean;
        timestamp: string;
      };
      version: string;
    }>('/health');
  }

  // Config
  async getAIModels() {
    return this.request<{
      models: Array<{
        id: string;
        modelId: string;
        provider: string;
        displayName: string;
        description: string;
        isPremium: boolean;
        isActive: boolean;
      }>;
    }>('/api/config/ai-models');
  }

  async getTTSVoices() {
    return this.request<{
      voices: Array<{
        id: string;
        voiceId: string;
        provider: string;
        displayName: string;
        description: string;
        language: string;
        gender: string;
        isPremium: boolean;
        isActive: boolean;
      }>;
    }>('/api/config/tts-voices');
  }
}

export const api = new ApiClient();