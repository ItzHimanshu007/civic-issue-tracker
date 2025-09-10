import { logger } from '../utils/logger';

interface ClassificationResult {
  category: 'POTHOLE' | 'STREETLIGHT' | 'GARBAGE' | 'WATER_LEAK' | 'SEWAGE' | 'ROAD_MAINTENANCE' | 'TRAFFIC_SIGNAL' | 'PARK_MAINTENANCE' | 'NOISE_POLLUTION' | 'OTHER';
  confidence: number;
  reasoning?: string;
}

interface ImageAnalysisResponse {
  labels: { name: string; confidence: number }[];
  description?: string;
}

export class MLClassificationService {
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  private readonly GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;

  constructor() {
    if (!this.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not provided - using rule-based classification');
    }
    if (!this.GOOGLE_VISION_API_KEY) {
      logger.warn('Google Vision API key not provided - using basic image analysis');
    }
  }

  /**
   * Classify issue based on text description and optional image
   */
  async classifyIssue(
    title: string,
    description: string,
    imageUrl?: string
  ): Promise<ClassificationResult> {
    try {
      // First, try AI-powered classification
      if (this.OPENAI_API_KEY) {
        const aiResult = await this.classifyWithOpenAI(title, description, imageUrl);
        if (aiResult) return aiResult;
      }

      // Fallback to rule-based classification
      return this.classifyWithRules(title, description);
    } catch (error) {
      logger.error('Classification error:', error);
      return this.classifyWithRules(title, description);
    }
  }

  /**
   * Classify using OpenAI GPT
   */
  private async classifyWithOpenAI(
    title: string,
    description: string,
    imageUrl?: string
  ): Promise<ClassificationResult | null> {
    try {
      const systemPrompt = `You are an AI assistant that categorizes civic issues. Based on the title and description provided, classify the issue into one of these categories:
      - POTHOLE: Road surface damage, holes in roads
      - STREETLIGHT: Broken or malfunctioning street lights
      - GARBAGE: Trash collection issues, illegal dumping, overflowing bins
      - WATER_LEAK: Water pipe leaks, flooding, water infrastructure issues
      - SEWAGE: Sewer problems, drainage issues, sewage overflow
      - ROAD_MAINTENANCE: Road repairs needed, signage issues, road markings
      - TRAFFIC_SIGNAL: Traffic light problems, stop sign issues
      - PARK_MAINTENANCE: Park facilities, playground equipment, landscaping
      - NOISE_POLLUTION: Excessive noise complaints
      - OTHER: Issues that don't fit the above categories

      Respond with a JSON object containing:
      {
        "category": "CATEGORY_NAME",
        "confidence": 0.95,
        "reasoning": "Brief explanation of why you chose this category"
      }`;

      const userPrompt = `Title: ${title}\nDescription: ${description}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        logger.error('OpenAI API error:', response.status);
        return null;
      }

      const data = await response.json() as any;
      const content = data.choices[0]?.message?.content;
      
      if (content) {
        const result = JSON.parse(content.trim());
        logger.info('AI classification result:', result);
        return result;
      }
      
      return null;
    } catch (error) {
      logger.error('OpenAI classification error:', error);
      return null;
    }
  }

  /**
   * Rule-based classification using keyword matching
   */
  private classifyWithRules(title: string, description: string): ClassificationResult {
    const text = `${title} ${description}`.toLowerCase();
    
    // Define keywords for each category
    const categories = [
      {
        category: 'POTHOLE' as const,
        keywords: ['pothole', 'road damage', 'hole in road', 'asphalt', 'pavement damage', 'road hole'],
        confidence: 0.8,
      },
      {
        category: 'STREETLIGHT' as const,
        keywords: ['street light', 'streetlight', 'lamp post', 'lighting', 'light not working', 'dark street'],
        confidence: 0.85,
      },
      {
        category: 'GARBAGE' as const,
        keywords: ['garbage', 'trash', 'litter', 'waste', 'dumping', 'bin', 'rubbish', 'refuse'],
        confidence: 0.8,
      },
      {
        category: 'WATER_LEAK' as const,
        keywords: ['water leak', 'pipe burst', 'flooding', 'water main', 'pipe leak', 'water damage'],
        confidence: 0.9,
      },
      {
        category: 'SEWAGE' as const,
        keywords: ['sewer', 'sewage', 'drain', 'drainage', 'overflow', 'manhole', 'storm drain'],
        confidence: 0.85,
      },
      {
        category: 'ROAD_MAINTENANCE' as const,
        keywords: ['road repair', 'road maintenance', 'sign', 'marking', 'crosswalk', 'curb', 'sidewalk'],
        confidence: 0.7,
      },
      {
        category: 'TRAFFIC_SIGNAL' as const,
        keywords: ['traffic light', 'stop sign', 'signal', 'traffic signal', 'intersection', 'yield sign'],
        confidence: 0.85,
      },
      {
        category: 'PARK_MAINTENANCE' as const,
        keywords: ['park', 'playground', 'bench', 'tree', 'grass', 'landscaping', 'garden', 'recreation'],
        confidence: 0.75,
      },
      {
        category: 'NOISE_POLLUTION' as const,
        keywords: ['noise', 'loud', 'sound', 'music', 'construction noise', 'disturbance'],
        confidence: 0.8,
      },
    ];

    // Find the best matching category
    let bestMatch: ClassificationResult = { category: 'OTHER', confidence: 0.3, reasoning: 'No specific keywords matched' };
    
    for (const cat of categories) {
      const matchedKeywords = cat.keywords.filter(keyword => text.includes(keyword));
      if (matchedKeywords.length > 0) {
        const confidence = Math.min(0.95, cat.confidence + (matchedKeywords.length - 1) * 0.05);
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            category: cat.category,
            confidence,
            reasoning: `Matched keywords: ${matchedKeywords.join(', ')}`,
          };
        }
      }
    }

    logger.info('Rule-based classification result:', bestMatch);
    return bestMatch;
  }

  /**
   * Analyze image using Google Vision API
   */
  async analyzeImage(imageUrl: string): Promise<ImageAnalysisResponse | null> {
    try {
      if (!this.GOOGLE_VISION_API_KEY) {
        logger.warn('Google Vision API key not available');
        return null;
      }

      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.GOOGLE_VISION_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { source: { imageUri: imageUrl } },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'TEXT_DETECTION', maxResults: 5 },
            ],
          }],
        }),
      });

      if (!response.ok) {
        logger.error('Google Vision API error:', response.status);
        return null;
      }

      const data = await response.json() as any;
      const annotations = data.responses[0];

      const labels = annotations.labelAnnotations?.map((label: any) => ({
        name: label.description,
        confidence: label.score,
      })) || [];

      const textAnnotations = annotations.textAnnotations?.[0]?.description || '';

      return {
        labels,
        description: textAnnotations,
      };
    } catch (error) {
      logger.error('Image analysis error:', error);
      return null;
    }
  }

  /**
   * Enhanced classification that includes image analysis
   */
  async classifyWithImage(
    title: string,
    description: string,
    imageUrl: string
  ): Promise<ClassificationResult> {
    try {
      // Analyze image first
      const imageAnalysis = await this.analyzeImage(imageUrl);
      
      // Enhance description with image analysis
      let enhancedDescription = description;
      if (imageAnalysis) {
        const imageLabels = imageAnalysis.labels.map(l => l.name).join(', ');
        const imageText = imageAnalysis.description || '';
        enhancedDescription += ` [Image contains: ${imageLabels}] [Text in image: ${imageText}]`;
      }

      // Classify with enhanced description
      return this.classifyIssue(title, enhancedDescription);
    } catch (error) {
      logger.error('Enhanced classification error:', error);
      return this.classifyIssue(title, description);
    }
  }

  /**
   * Batch classify multiple issues
   */
  async batchClassify(
    issues: Array<{ title: string; description: string; imageUrl?: string }>
  ): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];
    
    for (const issue of issues) {
      try {
        const result = issue.imageUrl
          ? await this.classifyWithImage(issue.title, issue.description, issue.imageUrl)
          : await this.classifyIssue(issue.title, issue.description);
        results.push(result);
      } catch (error) {
        logger.error('Batch classification error for issue:', error);
        results.push({ category: 'OTHER' as const, confidence: 0.3, reasoning: 'Classification failed' });
      }
    }

    return results;
  }
}

export const mlClassificationService = new MLClassificationService();
