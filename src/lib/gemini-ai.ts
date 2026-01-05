// Gemini AI service for enhanced search features
import { config } from './config';

const GEMINI_API_KEY = config.gemini.apiKey;
const GEMINI_BASE_URL = config.gemini.baseUrl;

export interface ProductCategory {
  category: string;
  confidence: number;
  subcategory?: string;
}

export interface MarketAnalysis {
  priceRange: string;
  marketTrend: 'increasing' | 'decreasing' | 'stable';
  bestTimeToBuy: string;
  pricePrediction: string;
  marketInsights: string[];
}

export interface ProductRecommendation {
  productName: string;
  reason: string;
  category: string;
  estimatedPrice: string;
  confidence: number;
}

export interface SmartSearchResult {
  enhancedQuery: string;
  categories: ProductCategory[];
  marketAnalysis: MarketAnalysis;
  recommendations: ProductRecommendation[];
  searchTips: string[];
}

export class GeminiAiService {
  private static instance: GeminiAiService;
  private apiKey: string;
  private useMockData: boolean;

  private constructor() {
    // In production, always use mock data for stability and to avoid API key exposure
    if (import.meta.env.PROD) {
      this.apiKey = ''; // Never store API key in production
      this.useMockData = true;
      
      if (config.debug.enabled) {
        console.log('Production mode: Using mock data only (AI features disabled)');
      }
      return;
    }

    // Development mode: check API key configuration
    this.apiKey = GEMINI_API_KEY;
    
    if (config.debug.enabled) {
      console.log('GeminiAiService constructor - API Key:', this.apiKey ? 'Present' : 'Missing');
      console.log('API Key length:', this.apiKey?.length || 0);
      console.log('API Key preview:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'Not set');
    }
    
    // Validate API key and set mock data mode accordingly
    this.useMockData = !this.validateApiKey();
    
    if (config.debug.enabled) {
      console.log('Using mock data:', this.useMockData);
    }
    
    if (this.useMockData) {
      console.warn('GEMINI_API_KEY is not properly configured. Using mock data for demonstration.');
    } else {
      // Test API connection in background (development only)
      this.testApiConnection().then(success => {
        if (!success) {
          console.warn('Gemini API connection test failed. Falling back to mock data mode.');
          this.useMockData = true;
        }
      });
    }
  }

  public static getInstance(): GeminiAiService {
    if (!GeminiAiService.instance) {
      GeminiAiService.instance = new GeminiAiService();
    }
    return GeminiAiService.instance;
  }

  public forceMockMode(): void {
    // Only allow forcing mock mode in development
    if (!import.meta.env.PROD) {
      this.useMockData = true;
      console.warn('Gemini API rate limited. Switching to mock data mode.');
    }
  }

  public isUsingMockData(): boolean {
    return this.useMockData;
  }

  public validateApiKey(): boolean {
    if (!this.apiKey || this.apiKey.length < 10) {
      console.warn('Gemini API key is invalid or missing');
      return false;
    }
    
    // Basic format validation for Google API keys
    if (!this.apiKey.startsWith('AIza')) {
      console.warn('Gemini API key format appears invalid (should start with AIza)');
      return false;
    }
    
    return true;
  }

  public async testApiConnection(): Promise<boolean> {
    // In production, skip API testing and return false to force mock mode
    if (import.meta.env.PROD) {
      return false;
    }

    if (this.useMockData) {
      console.log('API test skipped - using mock data mode');
      return false;
    }

    try {
      const testPrompt = 'Hello, this is a test message.';
      const response = await this.makeApiRequest(testPrompt);
      console.log('Gemini API test successful:', response.substring(0, 100) + '...');
      return true;
    } catch (error) {
      console.error('Gemini API test failed:', error);
      return false;
    }
  }

  public async makeApiRequest(prompt: string): Promise<any> {
    // Production: Always return mock data, never attempt API calls
    if (import.meta.env.PROD) {
      if (prompt.includes('"enhancedQuery"') || prompt.includes('"categories"') || prompt.includes('"marketAnalysis"')) {
        // This is likely an enhanceSearchQuery request - return structured mock data
        const query = this.extractQueryFromPrompt(prompt);
        return this.generateMockSmartSearchResult(query);
      } else {
        // Return a mock response string for chat/general requests
        return this.generateMockResponse(prompt);
      }
    }

    // Development mode: Check if using mock data
    if (this.useMockData) {
      // Check if this is a structured data request (contains JSON structure keywords)
      if (prompt.includes('"enhancedQuery"') || prompt.includes('"categories"') || prompt.includes('"marketAnalysis"')) {
        // This is likely an enhanceSearchQuery request - return structured mock data
        const query = this.extractQueryFromPrompt(prompt);
        return this.generateMockSmartSearchResult(query);
      } else {
        // Return a mock response string for chat/general requests
        return this.generateMockResponse(prompt);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Gemini API request timeout reached, aborting...');
      controller.abort();
    }, 30000); // Increased to 30 seconds

    try {
      // Add error handling for network issues
      if (!navigator.onLine) {
        throw new Error('No internet connection');
      }

      // Try multiple endpoints in order of preference
      const endpoints = [
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent'
      ];

      let response: Response | null = null;
      let lastError: string = '';

      for (const endpoint of endpoints) {
        try {
          response = await this.makeRequestWithRetry(endpoint, prompt, controller.signal);
          if (response && response.ok) {
            break; // Success, exit the loop
          } else if (response) {
            lastError = `Endpoint ${endpoint}: ${response.status} ${response.statusText}`;
            console.warn(`Failed to use endpoint ${endpoint}:`, response.status, response.statusText);
          } else {
            // makeRequestWithRetry returned null, meaning we switched to mock data
            return this.generateMockResponse(prompt);
          }
        } catch (fetchError) {
          // Check if it's an abort error
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
          }
          
          lastError = `Endpoint ${endpoint}: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`;
          console.warn(`Error with endpoint ${endpoint}:`, fetchError);
        }
      }

      if (!response || !response.ok) {
        // Check if all failures were due to rate limiting
        if (lastError.includes('429')) {
          this.forceMockMode();
        }
        throw new Error(`All Gemini API endpoints failed. Last error: ${lastError}`);
      }

      clearTimeout(timeoutId);

      const data = await response.json();
      
      // Validate response structure
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response structure from Gemini API');
      }
      
      return data.candidates[0].content.parts[0].text || '';
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('timed out')) {
          throw new Error('Request timed out. Please try again.');
        } else if (error.message.includes('Failed to fetch')) {
          throw new Error('Network error. Please check your internet connection.');
        } else if (error.message.includes('No internet connection')) {
          throw new Error('No internet connection. Please check your network.');
        }
      }
      
      // Log specific error details
      if (config.debug.enabled) {
        console.error('Gemini API request failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof Error ? error.constructor.name : typeof error,
          timestamp: new Date().toISOString()
        });
      }
      
      throw error;
    }
  }

  private async makeRequestWithRetry(endpoint: string, prompt: string, signal: AbortSignal, maxRetries: number = 2): Promise<Response | null> {
    // In production, never attempt API calls - return null to trigger mock fallback
    if (import.meta.env.PROD) {
      return null;
    }

    let lastResponse: Response | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check if request was already aborted
        if (signal.aborted) {
          throw new Error('Request was aborted');
        }

        const response = await fetch(`${endpoint}?key=${this.apiKey}`, {
          method: 'POST',
          signal: signal,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }]
          })
        });

        lastResponse = response;

        if (response.ok) {
          return response;
        }

        // If it's a 429 (Too Many Requests), wait longer and retry fewer times
        if (response.status === 429) {
          if (attempt < maxRetries) {
            const backoffMs = Math.pow(2, attempt) * 2000 + Math.random() * 1000; // Longer backoff: 2s, 4s
            console.warn(`Rate limited (429). Retrying in ${backoffMs}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue;
          } else {
            // If all retries failed with 429, switch to mock data immediately
            console.warn('All Gemini API retries failed with 429. Switching to mock data mode.');
            this.forceMockMode();
            return null; // Return null to trigger mock data fallback
          }
        }

        // For other errors, don't retry
        return response;
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw fetchError;
        }
        
        // For network errors, retry once
        if (attempt < 1) {
          const backoffMs = 1000 + Math.random() * 1000;
          console.warn(`Network error. Retrying in ${backoffMs}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        
        throw fetchError;
      }
    }
    
    return lastResponse;
  }

  private cleanGeminiResponse(response: string): string {
    // Remove markdown code blocks and extract JSON content
    let cleaned = response.trim();
    
    // Remove ```json and ``` markers
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    
    // Remove any leading/trailing whitespace and newlines
    cleaned = cleaned.trim();
    
    // Try to find JSON content between curly braces
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    // Try to find array content between square brackets
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      cleaned = arrayMatch[0];
    }
    
    return cleaned;
  }

  private safeJsonParse(response: string): any {
    try {
      // First try: direct parsing
      return JSON.parse(response);
    } catch (error1) {
      try {
        // Second try: clean the response and parse
        const cleaned = this.cleanGeminiResponse(response);
        return JSON.parse(cleaned);
      } catch (error2) {
        try {
          // Third try: find any JSON-like content and parse
          const jsonPattern = /(\{[\s\S]*\}|\[[\s\S]*\])/;
          const match = response.match(jsonPattern);
          if (match) {
            return JSON.parse(match[1]);
          }
        } catch (error3) {
          // All parsing attempts failed
          console.error('All JSON parsing attempts failed:');
          console.error('Original response:', response);
          console.error('Error 1 (direct):', error1);
          console.error('Error 2 (cleaned):', error2);
          console.error('Error 3 (pattern):', error3);
        }
      }
    }
    
    // If all parsing attempts fail, return null
    return null;
  }

  async enhanceSearchQuery(query: string): Promise<SmartSearchResult> {
    try {
      // In production, always use mock data
      if (import.meta.env.PROD) {
        return this.generateMockSmartSearchResult(query);
      }

      if (this.useMockData) {
        return this.generateMockSmartSearchResult(query);
      }

      const prompt = `
        Analyze this search query: "${query}"
        
        You must return ONLY valid JSON with this exact structure, no markdown, no explanations, no additional text:
        {
          "enhancedQuery": "enhanced search query",
          "categories": [
            {
              "category": "main category",
              "confidence": 0.95,
              "subcategory": "subcategory"
            }
          ],
          "marketAnalysis": {
            "priceRange": "price range in INR (₹)",
            "marketTrend": "increasing/decreasing/stable",
            "bestTimeToBuy": "recommendation",
            "pricePrediction": "prediction",
            "marketInsights": ["insight1", "insight2"]
          },
          "recommendations": [
            {
              "productName": "product name",
              "reason": "why recommend",
              "category": "category",
              "estimatedPrice": "price in INR (₹)",
              "confidence": 0.85
            }
          ],
          "searchTips": ["tip1", "tip2", "tip3"]
        }
        
        Focus on electronics, gadgets, and consumer products. Be specific and actionable.
        IMPORTANT: All prices must be in Indian Rupees (₹) format, not USD ($).
        CRITICAL: Return ONLY the JSON object above, nothing else.
      `;

      const response = await this.makeApiRequest(prompt);
      
      // Check if response is already a mock SmartSearchResult object (from fallback)
      if (typeof response === 'object' && response.enhancedQuery) {
        return response as SmartSearchResult;
      }
      
      try {
        const result = this.safeJsonParse(response);
        if (result) {
          return result;
        } else {
          console.error('Failed to parse Gemini response after all attempts');
          console.error('Raw response:', response);
          return this.generateMockSmartSearchResult(query);
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError);
        console.error('Raw response:', response);
        return this.generateMockSmartSearchResult(query);
      }
    } catch (error) {
      console.error('Error enhancing search query:', error);
      return this.generateMockSmartSearchResult(query);
    }
  }

  async categorizeProducts(products: any[]): Promise<ProductCategory[]> {
    try {
      // In production, always use mock data
      if (import.meta.env.PROD || this.useMockData) {
        return this.generateMockCategories();
      }

      const productTitles = products.map(p => p.title).join(', ');
      const prompt = `
        Categorize these products: ${productTitles}
        
        You must return ONLY valid JSON array with this exact structure, no markdown, no explanations:
        [
          {
            "category": "main category",
            "confidence": 0.95,
            "subcategory": "subcategory"
          }
        ]
        
        CRITICAL: Return ONLY the JSON array above, nothing else.
      `;

      const response = await this.makeApiRequest(prompt);
      
      try {
        const categories = this.safeJsonParse(response);
        if (categories) {
          return categories;
        } else {
          console.error('Failed to parse categories after all attempts');
          console.error('Raw response:', response);
          return this.generateMockCategories();
        }
      } catch (parseError) {
        console.error('Failed to parse categories:', parseError);
        console.error('Raw response:', response);
        return this.generateMockCategories();
      }
    } catch (error) {
      console.error('Error categorizing products:', error);
      return this.generateMockCategories();
    }
  }

  async analyzeMarketTrends(query: string, products: any[]): Promise<MarketAnalysis> {
    try {
      // In production, always use mock data
      if (import.meta.env.PROD || this.useMockData) {
        return this.generateMockMarketAnalysis();
      }

      const prices = products.map(p => p.price).join(', ');
      const prompt = `
        Analyze market trends for "${query}" with prices: ${prices}
        
        You must return ONLY valid JSON with this exact structure, no markdown, no explanations:
        {
          "priceRange": "price range in INR (₹)",
          "marketTrend": "increasing/decreasing/stable",
          "bestTimeToBuy": "recommendation",
          "pricePrediction": "prediction",
          "marketInsights": ["insight1", "insight2"]
        }
        
        IMPORTANT: All prices must be in Indian Rupees (₹) format, not USD ($).
        CRITICAL: Return ONLY the JSON object above, nothing else.
      `;

      const response = await this.makeApiRequest(prompt);
      
      try {
        const analysis = this.safeJsonParse(response);
        if (analysis) {
          return analysis;
        } else {
          console.error('Failed to parse market analysis after all attempts');
          console.error('Raw response:', response);
          return this.generateMockMarketAnalysis();
        }
      } catch (parseError) {
        console.error('Failed to parse market analysis:', parseError);
        console.error('Raw response:', response);
        return this.generateMockMarketAnalysis();
      }
    } catch (error) {
      console.error('Error analyzing market trends:', error);
      return this.generateMockMarketAnalysis();
    }
  }

  async getPersonalizedRecommendations(userQuery: string, searchHistory: string[] = []): Promise<ProductRecommendation[]> {
    try {
      // In production, always use mock data
      if (import.meta.env.PROD || this.useMockData) {
        return this.generateMockRecommendations();
      }

      const history = searchHistory.join(', ');
      const prompt = `
        Based on user query: "${userQuery}" and search history: [${history}]
        
        You must return ONLY valid JSON array with this exact structure, no markdown, no explanations:
        [
          {
            "productName": "product name",
            "reason": "why recommended",
            "category": "category",
            "estimatedPrice": "price in INR (₹)",
            "confidence": 0.85
          }
        ]
        
        IMPORTANT: All prices must be in Indian Rupees (₹) format, not USD ($).
        CRITICAL: Return ONLY the JSON array above, nothing else.
      `;

      const response = await this.makeApiRequest(prompt);
      
      try {
        const recommendations = this.safeJsonParse(response);
        if (recommendations) {
          return recommendations;
        } else {
          console.error('Failed to parse recommendations after all attempts');
          console.error('Raw response:', response);
          return this.generateMockRecommendations();
        }
      } catch (parseError) {
        console.error('Failed to parse recommendations:', parseError);
        console.error('Raw response:', response);
        return this.generateMockRecommendations();
      }
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return this.generateMockRecommendations();
    }
  }

  private generateMockSmartSearchResult(query: string): SmartSearchResult {
    const marketAnalysis = this.generateDynamicMarketAnalysis(query);
    const categories = this.generateDynamicCategories(query);
    
    return {
      enhancedQuery: `${query} best deals 2024`,
      categories,
      marketAnalysis,
      recommendations: [
        {
          productName: `${query} Pro Max`,
          reason: 'Premium variant with better features',
          category: categories[0]?.category || 'Electronics',
          estimatedPrice: marketAnalysis.priceRange.split(' - ')[1] || '₹1,20,000',
          confidence: 0.85
        },
        {
          productName: `${query} Lite`,
          reason: 'Budget-friendly alternative',
          category: categories[0]?.category || 'Electronics',
          estimatedPrice: marketAnalysis.priceRange.split(' - ')[0] || '₹60,000',
          confidence: 0.78
        }
      ],
      searchTips: this.generateDynamicSearchTips(query)
    };
  }

  private generateMockCategories(): ProductCategory[] {
    return this.generateDynamicCategories('general product');
  }

  private generateMockMarketAnalysis(): MarketAnalysis {
    return this.generateDynamicMarketAnalysis('general product');
  }

  private generateMockRecommendations(): ProductRecommendation[] {
    return [
      {
        productName: 'iPhone 15 Pro Max',
        reason: 'Premium flagship with advanced features',
        category: 'Electronics',
        estimatedPrice: '₹1,50,000',
        confidence: 0.85
      },
      {
        productName: 'Samsung Galaxy S24 Ultra',
        reason: 'Best Android alternative with S Pen',
        category: 'Electronics',
        estimatedPrice: '₹1,30,000',
        confidence: 0.78
      },
      {
        productName: 'Google Pixel 8 Pro',
        reason: 'Excellent camera and AI features',
        category: 'Electronics',
        estimatedPrice: '₹1,10,000',
        confidence: 0.72
      }
    ];
  }

  private generateDynamicMarketAnalysis(query: string): MarketAnalysis {
    const lowerQuery = query.toLowerCase();
    const currentMonth = new Date().getMonth(); // 0-11
    const currentDate = new Date().getDate();
    
    // Determine product category and characteristics
    const isElectronics = /phone|laptop|tablet|tv|camera|headphone|speaker|watch|gaming|console|monitor/i.test(query);
    const isApple = /iphone|ipad|macbook|apple|airpods/i.test(query);
    const isClothing = /shirt|jeans|dress|shoes|jacket|clothing|fashion/i.test(query);
    const isHome = /furniture|kitchen|home|decor|appliance/i.test(query);
    const isBook = /book|novel|textbook|guide/i.test(query);
    const isExpensive = /pro|max|ultra|premium|flagship/i.test(query);
    
    // Generate dynamic price ranges based on product type
    let priceRange: string;
    if (isApple && isExpensive) {
      priceRange = '₹1,00,000 - ₹2,00,000';
    } else if (isElectronics && isExpensive) {
      priceRange = '₹50,000 - ₹1,50,000';
    } else if (isElectronics) {
      priceRange = '₹15,000 - ₹80,000';
    } else if (isClothing) {
      priceRange = '₹500 - ₹5,000';
    } else if (isHome) {
      priceRange = '₹2,000 - ₹50,000';
    } else if (isBook) {
      priceRange = '₹200 - ₹2,000';
    } else {
      priceRange = '₹1,000 - ₹25,000';
    }
    
    // Generate dynamic market trends
    const trends: ('increasing' | 'decreasing' | 'stable')[] = ['increasing', 'decreasing', 'stable'];
    let marketTrend: 'increasing' | 'decreasing' | 'stable';
    
    if (isElectronics) {
      // Electronics tend to decrease over time, especially before new launches
      marketTrend = currentMonth >= 8 ? 'decreasing' : 'stable'; // Sep-Dec usually see drops
    } else if (isClothing) {
      // Clothing has seasonal patterns
      marketTrend = currentMonth === 1 || currentMonth === 6 ? 'decreasing' : 'stable'; // Jan & July sales
    } else {
      // Random for other categories
      marketTrend = trends[Math.floor(Math.random() * trends.length)];
    }
    
    // Generate dynamic timing recommendations
    let bestTimeToBuy: string;
    let pricePrediction: string;
    
    if (isElectronics) {
      if (currentMonth >= 9 && currentMonth <= 11) { // Oct-Dec
        bestTimeToBuy = 'Buy now during festive season';
        pricePrediction = 'Prices at yearly low, good time to purchase';
      } else if (currentMonth >= 0 && currentMonth <= 2) { // Jan-Mar
        bestTimeToBuy = 'Wait 1-2 months for better deals';
        pricePrediction = 'Prices may drop 5-10% in coming months';
      } else if (currentMonth >= 6 && currentMonth <= 8) { // Jul-Sep
        bestTimeToBuy = 'Wait 3-4 weeks for festive sales';
        pricePrediction = 'Major discounts expected during upcoming festivals';
      } else {
        bestTimeToBuy = 'Current prices are moderate, can buy now';
        pricePrediction = 'Prices expected to remain stable for next 2-3 months';
      }
    } else if (isClothing) {
      if (currentMonth === 0 || currentMonth === 5 || currentMonth === 6) { // Jan, Jun, Jul
        bestTimeToBuy = 'Buy now during seasonal sale';
        pricePrediction = 'End of season clearance offers available';
      } else if (currentMonth >= 9 && currentMonth <= 11) {
        bestTimeToBuy = 'Wait 4-6 weeks for year-end sales';
        pricePrediction = 'Better discounts expected during winter sales';
      } else {
        bestTimeToBuy = 'Wait 2-3 weeks for next sale period';
        pricePrediction = 'Seasonal sales coming up with 20-40% discounts';
      }
    } else if (isHome) {
      if (currentMonth >= 9 && currentMonth <= 11) {
        bestTimeToBuy = 'Buy now during festive home decor season';
        pricePrediction = 'Good deals available for home improvement';
      } else {
        bestTimeToBuy = 'Wait 3-5 weeks for better offers';
        pricePrediction = 'Home appliance sales expected soon';
      }
    } else if (isBook) {
      bestTimeToBuy = 'Buy now, book prices are generally stable';
      pricePrediction = 'Book prices rarely fluctuate significantly';
    } else {
      // Generic timing based on current date
      const dayOfMonth = currentDate;
      if (dayOfMonth <= 10) {
        bestTimeToBuy = 'Wait 2-3 weeks for mid-month offers';
        pricePrediction = 'Better deals typically available mid-month';
      } else if (dayOfMonth <= 20) {
        bestTimeToBuy = 'Good time to buy, prices are competitive';
        pricePrediction = 'Current pricing is reasonable for this category';
      } else {
        bestTimeToBuy = 'Wait 1-2 weeks for month-end clearance';
        pricePrediction = 'Month-end sales may offer additional discounts';
      }
    }
    
    // Generate dynamic market insights
    const insights: string[] = [];
    
    if (isElectronics) {
      insights.push('New model launches can trigger price drops on older versions');
      if (currentMonth >= 8) {
        insights.push('Festive season brings the best electronics deals');
      }
      insights.push('Consider refurbished options for significant savings');
    } else if (isClothing) {
      insights.push('End-of-season sales offer maximum discounts');
      insights.push('Online exclusive deals often beat retail prices');
    } else if (isHome) {
      insights.push('Bulk purchases during sales can reduce per-unit cost');
      insights.push('Check for installation and warranty offers');
    } else {
      insights.push('Compare prices across multiple platforms');
      insights.push('Look for cashback and reward point offers');
    }
    
    return {
      priceRange,
      marketTrend,
      bestTimeToBuy,
      pricePrediction,
      marketInsights: insights
    };
  }
  
  private generateDynamicCategories(query: string): ProductCategory[] {
    const lowerQuery = query.toLowerCase();
    const categories: ProductCategory[] = [];
    
    if (/phone|smartphone|mobile/i.test(query)) {
      categories.push({ category: 'Electronics', confidence: 0.95, subcategory: 'Smartphones' });
      categories.push({ category: 'Mobile Devices', confidence: 0.88, subcategory: 'Communication' });
    } else if (/laptop|computer|pc/i.test(query)) {
      categories.push({ category: 'Electronics', confidence: 0.92, subcategory: 'Computers' });
      categories.push({ category: 'Technology', confidence: 0.85, subcategory: 'Computing' });
    } else if (/tv|television|monitor/i.test(query)) {
      categories.push({ category: 'Electronics', confidence: 0.90, subcategory: 'Display' });
      categories.push({ category: 'Home Entertainment', confidence: 0.82, subcategory: 'Audio Visual' });
    } else if (/headphone|earphone|speaker|audio/i.test(query)) {
      categories.push({ category: 'Electronics', confidence: 0.88, subcategory: 'Audio' });
      categories.push({ category: 'Accessories', confidence: 0.75, subcategory: 'Audio Accessories' });
    } else if (/watch|smartwatch/i.test(query)) {
      categories.push({ category: 'Electronics', confidence: 0.85, subcategory: 'Wearables' });
      categories.push({ category: 'Fashion', confidence: 0.70, subcategory: 'Accessories' });
    } else if (/shirt|jeans|dress|clothing|fashion/i.test(query)) {
      categories.push({ category: 'Fashion', confidence: 0.90, subcategory: 'Apparel' });
      categories.push({ category: 'Clothing', confidence: 0.85, subcategory: 'Casual Wear' });
    } else if (/shoes|sneaker|footwear/i.test(query)) {
      categories.push({ category: 'Fashion', confidence: 0.88, subcategory: 'Footwear' });
      categories.push({ category: 'Sports', confidence: 0.72, subcategory: 'Athletic Wear' });
    } else if (/book|novel|guide/i.test(query)) {
      categories.push({ category: 'Books', confidence: 0.92, subcategory: 'Literature' });
      categories.push({ category: 'Education', confidence: 0.78, subcategory: 'Learning Materials' });
    } else if (/furniture|home|decor/i.test(query)) {
      categories.push({ category: 'Home & Garden', confidence: 0.87, subcategory: 'Furniture' });
      categories.push({ category: 'Lifestyle', confidence: 0.75, subcategory: 'Home Improvement' });
    } else {
      // Default categories
      categories.push({ category: 'General', confidence: 0.80, subcategory: 'Consumer Goods' });
      categories.push({ category: 'Retail', confidence: 0.70, subcategory: 'Miscellaneous' });
    }
    
    return categories;
  }
  
  private generateDynamicSearchTips(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const tips: string[] = ['Compare prices across multiple platforms'];
    
    if (/phone|laptop|electronics/i.test(query)) {
      tips.push('Check for student discounts and educational offers');
      tips.push('Look for exchange offers with old devices');
      tips.push('Consider extended warranty options');
      tips.push('Check EMI options for expensive purchases');
    } else if (/clothing|fashion/i.test(query)) {
      tips.push('Check size charts carefully before ordering');
      tips.push('Look for seasonal clearance sales');
      tips.push('Read fabric and care instructions');
      tips.push('Check return and exchange policies');
    } else if (/book/i.test(query)) {
      tips.push('Consider digital versions for instant access');
      tips.push('Check for used book options');
      tips.push('Look for bundle deals with related titles');
    } else {
      tips.push('Read customer reviews and ratings');
      tips.push('Check for cashback offers and reward points');
      tips.push('Look for bulk purchase discounts');
    }
    
    return tips;
  }

  private extractQueryFromPrompt(prompt: string): string {
    // Extract the query from prompts like: Analyze this search query: "detector"
    const match = prompt.match(/Analyze this search query:\s*"([^"]+)"/);
    return match ? match[1] : 'general product';
  }

  private extractUserQuestion(prompt: string): string {
    // Extract the actual user question from the AI prompt
    // Look for patterns like "The user asked: "..." or "user asked: "...""
    const userQuestionMatch = prompt.match(/(?:user asked|user says|user is asking|user question):\s*"([^"]+)"/i);
    if (userQuestionMatch) {
      return userQuestionMatch[1];
    }

    // Fallback: try to find quoted text
    const quotedMatch = prompt.match(/"([^"]+)"/);
    if (quotedMatch) {
      return quotedMatch[1];
    }

    // Last resort: return the whole prompt
    return prompt;
  }

  private generateMockResponse(prompt: string): string {
    // Generate contextual, conversational mock responses based on the prompt
    const lowerPrompt = prompt.toLowerCase();

    // Extract user question from the prompt (remove context and instructions)
    const userQuestion = this.extractUserQuestion(prompt);
    const lowerQuestion = userQuestion.toLowerCase();

    // Handle greetings and introductions
    if (lowerQuestion.includes('hello') || lowerQuestion.includes('hi') || lowerQuestion.includes('hey') ||
        lowerQuestion.includes('start') || lowerQuestion.includes('begin')) {
      const greetings = [
        "Hi there! 👋 I'm excited to help you find the perfect products. What are you shopping for today?",
        "Hello! Welcome to your personal shopping assistant. I can help you discover great deals and make smart purchasing decisions. What interests you?",
        "Hey! I'm here to make your shopping experience amazing. Whether you're looking for the latest gadgets, fashion, or home essentials, I've got you covered. What's on your shopping list?",
        "Hi! Thanks for chatting with me. I love helping people find exactly what they need at the best prices. What can I help you discover today?"
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
    // Handle questions about specific product categories
    if (lowerQuestion.includes('phone') || lowerQuestion.includes('smartphone') || lowerQuestion.includes('mobile')) {
      const phoneResponses = [
        "Smartphones are constantly evolving! Right now, I'd recommend looking at the latest iPhone 15 series or Samsung Galaxy S24 lineup. Both offer excellent cameras, performance, and battery life. The iPhone 15 Pro starts around ₹1,30,000, while Samsung's flagship is about ₹1,00,000. Which features matter most to you - camera, battery, or gaming performance?",
        "When it comes to phones, it really depends on your budget and needs. For premium users, the iPhone 15 Pro Max offers the best camera and ecosystem integration. If you're looking for great value, Samsung Galaxy S24 Ultra gives you similar features at a lower price point. Both are excellent choices with 5G support and long-term software updates.",
        "Phone shopping can be overwhelming with so many options! Let me help you narrow it down. Are you upgrading from an older phone, or is this your first smartphone? Also, what's your budget range? This will help me give you more targeted recommendations."
      ];
      return phoneResponses[Math.floor(Math.random() * phoneResponses.length)];
    }
    if (lowerQuestion.includes('laptop') || lowerQuestion.includes('computer') || lowerQuestion.includes('macbook')) {
      const laptopResponses = [
        "Laptops are such a personal choice! For students and general use, I'd recommend the MacBook Air M2 - it's lightweight, has amazing battery life (up to 18 hours), and handles everything from browsing to light video editing. It starts at around ₹1,10,000. If you need more power for gaming or professional work, consider a Windows laptop with dedicated graphics.",
        "The laptop market has something for everyone. If you're into the Apple ecosystem and value design, the MacBook Pro M3 is incredible for creative work. For gaming, look at ASUS ROG or MSI laptops. And for everyday use, Lenovo ThinkPad or Dell XPS series offer great reliability. What's your primary use case - work, gaming, or general browsing?",
        "Great question about laptops! Current trends show that Apple Silicon Macs are dominating for their efficiency, while gaming laptops from ASUS and MSI offer incredible performance. For business users, ThinkPad reliability is unmatched. Do you have a preference for Windows, macOS, or are you open to both?"
      ];
      return laptopResponses[Math.floor(Math.random() * laptopResponses.length)];
    }
    // Handle price and deal questions
    if (lowerQuestion.includes('price') || lowerQuestion.includes('cost') || lowerQuestion.includes('expensive') ||
        lowerQuestion.includes('cheap') || lowerQuestion.includes('budget') || lowerQuestion.includes('deal')) {
      const priceResponses = [
        "Smart shopping is all about timing! Prices typically drop during major sales like Amazon Great Indian Festival, Flipkart Big Billion Days, and festive seasons (October-December). Right now, you can find up to 40% off on electronics. Also, check for bank offers, exchange deals, and student discounts. What product are you interested in?",
        "The best deals happen during shopping festivals! We're currently in a good period with various offers running. Electronics see the biggest discounts (up to 50% off), followed by fashion and home goods. Pro tip: Set price alerts on apps and wait for sales rather than buying at full price. What's your budget for what you're looking for?",
        "Price comparison is crucial in India! Amazon, Flipkart, Croma, and Vijay Sales often have competing offers. Don't forget about cashback apps like CashKaro and bank credit card rewards. For big purchases, EMI options can make expensive items more affordable. What category interests you most?"
      ];
      return priceResponses[Math.floor(Math.random() * priceResponses.length)];
    }
    // Handle audio and headphones questions
    if (lowerQuestion.includes('audio') || lowerQuestion.includes('headphone') || lowerQuestion.includes('earphone') ||
        lowerQuestion.includes('speaker') || lowerQuestion.includes('sound')) {
      const audioResponses = [
        "Audio quality can make or break your experience! For wireless earbuds, the Sony WF-1000XM5 offers incredible noise cancellation and sound quality, though they're pricey at ₹25,000+. If you're on a budget, OnePlus Buds Pro 2 gives great value at ₹10,000. For over-ear headphones, Bose QuietComfort Ultra delivers premium comfort and ANC.",
        "When it comes to audio gear, it depends on your usage. For commuting and calls, I'd recommend true wireless earbuds with good ANC. For music production or critical listening, over-ear headphones with high-end drivers are better. Sony and Bose dominate the premium segment, while brands like boAt and Noise offer affordable alternatives with decent quality.",
        "Audio shopping is exciting! Current favorites include Sony WH-1000XM5 for noise cancellation, Bose QuietComfort for comfort, and Apple AirPods Pro for seamless iPhone integration. Don't forget to check reviews for fit and battery life. What type of audio gear are you looking for - earbuds, headphones, or speakers?"
      ];
      return audioResponses[Math.floor(Math.random() * audioResponses.length)];
    }

    // Handle trend and market questions
    if (lowerQuestion.includes('trend') || lowerQuestion.includes('popular') || lowerQuestion.includes('hot') ||
        lowerQuestion.includes('new') || lowerQuestion.includes('latest')) {
      const trendResponses = [
        "2024 is all about AI integration and sustainability! Smartphones with advanced cameras, foldable displays, and AI features are trending. In laptops, Apple Silicon Macs are dominating, while gaming laptops with RTX 40-series GPUs are hot. Sustainable products and energy-efficient appliances are also gaining popularity.",
        "Current shopping trends show strong demand for: 1) AI-powered devices (smartphones, smart home gadgets), 2) Sustainable and eco-friendly products, 3) Foldable phones and flexible displays, 4) High-refresh-rate gaming monitors, 5) Wireless charging everywhere. What category interests you most?",
        "The market is evolving rapidly! Right now, we're seeing a surge in demand for electric vehicles, smart home automation, and AI assistants. In consumer electronics, 8K TVs and high-end gaming PCs are popular. Fashion trends lean towards sustainable materials and versatile athleisure wear. What's catching your eye?"
      ];
      return trendResponses[Math.floor(Math.random() * trendResponses.length)];
    }

    // Handle comparison questions
    if (lowerQuestion.includes('compare') || lowerQuestion.includes('vs') || lowerQuestion.includes('versus') ||
        lowerQuestion.includes('better') || lowerQuestion.includes('which is')) {
      const compareResponses = [
        "Great question for comparisons! To give you the best advice, I need to know what you're comparing. For example: iPhone vs Samsung (iPhone wins on ecosystem, Samsung on value), MacBook vs Windows laptops (Mac for creative work, Windows for gaming), or specific models? What products are you considering?",
        "Comparisons help make informed decisions! Generally, I compare based on: performance, price, build quality, software support, and user reviews. Apple products excel in ecosystem integration and long-term support, while Android/Windows offer more customization. Premium brands like Sony and Bose focus on quality, while budget brands prioritize value. What are you comparing?",
        "Smart comparisons save money and buyer's remorse! Key factors include: 1) Performance vs price ratio, 2) Build quality and durability, 3) Software updates and support, 4) User reviews and ratings, 5) Warranty and after-sales service. Indian market favorites include Samsung for value, Apple for premium, and OnePlus for performance. What would you like me to compare?"
      ];
      return compareResponses[Math.floor(Math.random() * compareResponses.length)];
    }

    // Handle warranty and support questions
    if (lowerQuestion.includes('warranty') || lowerQuestion.includes('support') || lowerQuestion.includes('service') ||
        lowerQuestion.includes('repair') || lowerQuestion.includes('guarantee')) {
      const warrantyResponses = [
        "Warranty is crucial for peace of mind! Most electronics come with 1-2 year manufacturer warranty covering manufacturing defects. Extended warranties are available for ₹2,000-5,000 extra. Apple offers excellent support with authorized service centers everywhere. Always buy from authorized dealers to ensure valid warranty coverage.",
        "Good warranty coverage is essential! Premium brands like Apple, Samsung, and Sony offer comprehensive support with dedicated service centers. Budget brands typically provide 1-year warranty with good coverage. Pro tip: Register your product online immediately after purchase and keep all bills safe. What product are you considering?",
        "Service and support vary by brand. Apple leads with seamless ecosystem support, Samsung has widespread service centers, while local brands like Lava and Micromax offer good regional support. For high-value purchases, consider extended warranty plans. Always check the warranty card and terms carefully before buying."
      ];
      return warrantyResponses[Math.floor(Math.random() * warrantyResponses.length)];
    }

    // Handle advice and tips
    if (lowerQuestion.includes('advice') || lowerQuestion.includes('tip') || lowerQuestion.includes('how to') ||
        lowerQuestion.includes('guide') || lowerQuestion.includes('help')) {
      const adviceResponses = [
        "Smart shopping tips: 1) Compare prices across platforms, 2) Read recent reviews (last 3 months), 3) Check return policies, 4) Look for cashback offers, 5) Consider future needs, not just current ones. For big purchases, wait for sales or use credit card rewards. What specific advice do you need?",
        "Here's my shopping wisdom: Always research thoroughly, never buy impulsively on deals, check user reviews on multiple sites, and consider the total cost of ownership (including accessories and maintenance). For electronics, focus on reputable brands with good service networks. What's your shopping challenge?",
        "Pro shopping advice: 1) Set a realistic budget first, 2) Make a wishlist and compare options, 3) Read specifications carefully, 4) Check compatibility with existing devices, 5) Buy from authorized sellers for warranty validity. For online shopping, use secure payment methods and track your orders. How can I assist you today?"
      ];
      return adviceResponses[Math.floor(Math.random() * adviceResponses.length)];
    }

    // Handle thank you responses
    if (lowerQuestion.includes('thank') || lowerQuestion.includes('thanks') || lowerQuestion.includes('appreciate')) {
      const thankResponses = [
        "You're very welcome! I'm always here to help you make great shopping decisions. Feel free to ask if you need more recommendations or have any other questions. Happy shopping! 🛒",
        "My pleasure! Shopping can be overwhelming, but I'm glad I could help. Remember, I'm here whenever you need advice on products, deals, or anything shopping-related. Have a great day!",
        "Glad I could help! Don't hesitate to reach out anytime you need shopping assistance. Whether it's product research, price comparison, or finding the best deals, I'm your go-to shopping companion. 😊"
      ];
      return thankResponses[Math.floor(Math.random() * thankResponses.length)];
    }
    // Default conversational response
    const defaultResponses = [
      "That's an interesting question! I'd love to help you find the perfect solution. Could you tell me more about what you're looking for? For example, what's your budget, or what features are most important to you?",
      "Great question! Shopping decisions are important, and I want to make sure you get exactly what you need. To give you the best advice, could you share a bit more about your requirements or preferences?",
      "I'm here to help you make smart shopping decisions! Whether you're looking for the latest tech, fashion essentials, or home improvements, I can provide recommendations and insights. What specific product or category interests you?",
      "Thanks for asking! I can help you navigate the vast world of online shopping in India. From finding the best deals to understanding product specifications, I'm your shopping companion. What would you like to explore today?"
    ];

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }
}

export default GeminiAiService;
