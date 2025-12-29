import { GoogleGenAI, Type } from "@google/genai";
import { IdeaData, FieldName, CompetitorData, PPRData, PatentJudgement, Financials } from '../types';

// Helper to get a fresh client instance (important for dynamic API keys)
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Default conciseness for general fields
const DEFAULT_LIMIT = 20;

// Helper to clean JSON strings from Markdown code blocks
const cleanJson = (text: string): string => {
  if (!text) return "{}";
  // Remove ```json and ``` wrapping
  return text.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
};

// Helper to strip markdown formatting for plain text requirements
const stripMarkdown = (text: string): string => {
  if (!text) return "";
  let clean = text.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
  clean = clean.replace(/\*(.*?)\*/g, '$1'); // Italic
  clean = clean.replace(/#{1,6}\s?/g, ''); // Headers
  clean = clean.replace(/`{3}[\s\S]*?`{3}/g, ''); // Code blocks
  return clean;
};

export const enhanceFieldContent = async (
  currentFieldKey: FieldName | string,
  currentValue: string,
  allData: IdeaData,
  existingSiblings: string[] = []
): Promise<string> => {
  try {
    const ai = getAi();
    const context = JSON.stringify(allData);
    
    const prompt = `
      Act as a product consultant.
      Task: Rewrite field "${currentFieldKey}".
      Current: "${currentValue}"
      Context: ${context}
      Avoid: ${existingSiblings.join(', ')}
      
      Requirements:
      1. STRICT CONSTRAINT: Output must be exactly ONE single sentence. Maximum ${DEFAULT_LIMIT} words.
      2. Professional tone, UK English.
      3. No "tech-savvy" or jargon.
      4. DISTINCT from "Avoid" list.
      5. Return ONLY the text.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || currentValue;
  } catch (error) {
    console.error("Error enhancing content:", error);
    return currentValue;
  }
};

export const researchCompetitors = async (ideaData: IdeaData): Promise<CompetitorData[]> => {
  try {
    const ai = getAi();
    const prompt = `
      Find 3 REAL competitors for: ${ideaData.title} (${ideaData.solution}).
      
      Return JSON 'products' array (3 items).
      For EACH product, you MUST provide:
      1. Name, Brand, RRP (GBP), URL.
      2. 'features': Exactly 3 distinct ways it does the job (Max 15 words each). MUST NOT BE EMPTY.
      3. 'problems': Exactly 3 distinct weaknesses/complaints (Max 15 words each). MUST NOT BE EMPTY.
      4. Image description (Max 10 words).

      CRITICAL: If exact features/problems are not explicitly listed in search, INFER logical ones based on the product type to ensure data is populated.
      ENSURE URLs start with https://
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            products: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  brand: { type: Type.STRING },
                  price: { type: Type.STRING },
                  features: { type: Type.ARRAY, items: { type: Type.STRING } },
                  problems: { type: Type.ARRAY, items: { type: Type.STRING } },
                  url: { type: Type.STRING },
                  imageUrl: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      const cleanText = cleanJson(response.text);
      const data = JSON.parse(cleanText);
      if (data.products && Array.isArray(data.products)) {
        return data.products.slice(0, 3).map((item: any) => ({
          ...item,
          // Ensure arrays have 3 items even if AI returns fewer
          features: [...(item.features || []), "Standard functionality", "Basic design"].slice(0, 3),
          problems: [...(item.problems || []), "Generic limitation", "Standard wear and tear"].slice(0, 3),
          imageUrl: item.imageUrl || '',
          url: item.url || 'https://google.com/search?q=' + encodeURIComponent(item.name)
        }));
      }
    }
    return [];
  } catch (error) {
    console.error("Competitor research failed:", error);
    return [];
  }
};

export const generateProblemSummaries = async (ideaData: IdeaData, competitors: CompetitorData[]): Promise<[string, string, string]> => {
  try {
    const ai = getAi();
    const prompt = `
      Based on competitors: ${competitors.map(c => c.name).join(', ')}.
      Generate 3 distinct market problem summaries.
      
      Requirements:
      1. STRICT CONSTRAINT: Output must be exactly ONE single sentence. Maximum ${DEFAULT_LIMIT} words.
      2. No specific competitor names.
      3. Distinct angles (e.g. Price, Quality, Safety).
      
      Return JSON: { "summaries": ["...", "...", "..."] }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summaries: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    if (response.text) {
      const cleanText = cleanJson(response.text);
      const data = JSON.parse(cleanText);
      return [data.summaries?.[0] || '', data.summaries?.[1] || '', data.summaries?.[2] || ''];
    }
    return ['', '', ''];
  } catch (e) {
    return ['', '', ''];
  }
};

export const generateMarketData = async (ideaData: IdeaData): Promise<{ data: string; url: string }> => {
  const ai = getAi();
  try {
    const prompt = `
      Perform a Google Search to find a market size or growth statistic for the industry related to: "${ideaData.title}" (or its broader sector).
      Instructions:
      1. Find a specific number (e.g., "$X Billion" or "X% growth").
      2. Return a concise, natural language sentence stating this fact. 
      3. Do NOT format as JSON. Just write the sentence.
      4. If you cannot find data for the specific product, use the general industry (e.g., "Pet Care" instead of "Dog Walker").
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    let text = response.text || "";
    let url = "";

    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        const chunks = response.candidates[0].groundingMetadata.groundingChunks;
        const webChunk = chunks.find((c: any) => c.web?.uri);
        if (webChunk) {
            url = webChunk.web.uri;
        }
    }

    if (!url) {
        const urlMatch = text.match(/https?:\/\/[^\s)]+/);
        if (urlMatch) {
            url = urlMatch[0];
        }
    }

    text = text.replace(/\[\d+\]/g, '').trim();
    
    if (text.length > 5) {
        if (text.length > 250) text = text.substring(0, 247) + "...";
        if (!url) {
            url = `https://www.google.com/search?q=${encodeURIComponent(ideaData.title + " market statistics")}`;
        }
        return { data: text, url: url };
    }
  } catch (e) {
    console.error("Strategy 1 (Search) failed", e);
  }

  try {
      const fallbackPrompt = `
          Provide a generic estimate for the market size of the industry related to: "${ideaData.title}".
          Output ONLY a single sentence like: "The [Sector] market is a multi-billion dollar industry globally."
          Do not use markdown.
      `;
      const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: fallbackPrompt
      });
      
      if (fallbackResponse.text) {
          return {
              data: fallbackResponse.text.trim(),
              // Provide a search URL so the user isn't left with an empty field
              url: `https://www.google.com/search?q=${encodeURIComponent(ideaData.title + " market size")}`
          };
      }
  } catch (e) {
      console.error("Strategy 2 (Fallback) failed", e);
  }

  return { data: 'Market data unavailable at this time.', url: '' };
};

export const generateUVP = async (ideaData: IdeaData): Promise<string> => {
    try {
        const ai = getAi();
        const prompt = `
            Analyze this product idea:
            Title: ${ideaData.title}
            Solution: ${ideaData.solution}

            Task: Write a Unique Value Proposition (UVP).
            CRITICAL QUESTION TO ANSWER: What makes this new product better than anything previously released or currently on the market?
            
            Requirements:
            1. STRICT CONSTRAINT: Output must be exactly ONE single sentence.
            2. Max 20 words.
            3. Focus on the comparative advantage.
            4. Return ONLY the text string.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt
        });

        return response.text?.trim() || "";
    } catch (e) {
        return "";
    }
}

export const generateFinancials = async (ideaData: IdeaData): Promise<Financials> => {
  try {
    const ai = getAi();
    const prompt = `
      Estimate UK financials for: "${ideaData.title}".
      Return JSON:
      - rrp: number only (e.g. "24.99")
      - year3Sales: number only (e.g. "5000")
      - addOnItem: Max 3 words
      - addOnValue: number only (e.g. "5.00")
      - targetRevenue: sum of rrp + addOnValue
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
              rrp: { type: Type.STRING },
              year3Sales: { type: Type.STRING },
              addOnItem: { type: Type.STRING },
              addOnValue: { type: Type.STRING },
              targetRevenue: { type: Type.STRING }
            }
          }
      }
    });

    if (response.text) {
        const cleanText = cleanJson(response.text);
        return JSON.parse(cleanText);
    }
    throw new Error("No data");
  } catch (e) {
    return { rrp: '', year3Sales: '', addOnValue: '', addOnItem: '', targetRevenue: '' };
  }
};

export const generatePatentJudgement = async (ideaData: IdeaData, pprData: PPRData): Promise<PatentJudgement> => {
  try {
    const ai = getAi();
    const prompt = `
      Act as a conservative, cautious Patent Attorney.
      
      Task: Provide a preliminary patentability opinion for:
      Title: ${ideaData.title}
      Description: ${ideaData.solution}
      
      Assessment Rules:
      1. TONE: Neutral, professional, non-committal. Use phrases like "may be eligible," "might be considered," "it is arguable."
      2. NO GUARANTEES: Never say "This is patentable." Instead say "It may meet the criteria for..."
      3. NO STATUTES: Do not cite specific sections of law (e.g. UK Patents Act). Keep it general to patent principles (novelty, inventive step).
      4. INVENTIVE STEP WARNING: Explicitly warn that if the idea is seen as a simple aggregation (collocation) of known features, it might be rejected for lacking an inventive step.
      5. CONCLUSION: End with a recommendation to seek professional advice.
      
      Output JSON:
      - isPatentable: boolean (True = potentially worth pursuing, False = clearly excluded/common).
      - rationale: A single paragraph (approx 80 words) summarizing the analysis.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isPatentable: { type: Type.BOOLEAN },
            rationale: { type: Type.STRING }
          }
        }
      }
    });

    if (response.text) {
        const cleanText = cleanJson(response.text);
        return JSON.parse(cleanText);
    }
    throw new Error("Failed");
  } catch (error) {
    return { isPatentable: false, rationale: "We could not generate an automatic assessment. We recommend a consultation to explore Design Rights or Patent potential manually." };
  }
};

export const generateGenericSuggestion = async (context: string, fieldType: string, maxWords: number = 20): Promise<string> => {
  try {
     const ai = getAi();
     const prompt = `
     Context: ${context}.
     Suggest entry for: "${fieldType}".
     
     Requirements:
     1. STRICT CONSTRAINT: Output must be exactly ONE single sentence. Maximum ${maxWords} words.
     2. Distinct from Context siblings.
     3. No "tech-savvy".
     `;
     const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "text/plain"
      }
    });
    return response.text?.trim() || "";
  } catch (e) {
    return "";
  }
}

export const generatePatentDescription = async (
  ideaData: IdeaData, 
  extraDetails: { components: string, variations: string }
): Promise<string> => {
  try {
    const ai = getAi();
    const prompt = `
      Act as a UK Patent Attorney.
      Task: Draft the "Description" section of a UK Patent Application for the following invention.
      
      Title: ${ideaData.title}
      Problem: ${ideaData.problem}
      Solution: ${ideaData.solution}
      Key Components: ${extraDetails.components}
      Variations: ${extraDetails.variations}
      
      Format Requirements:
      1. PLAIN TEXT ONLY. DO NOT use markdown formatting (no bold **, no headers #). Use CAPITALIZED headers instead (e.g. FIELD OF THE INVENTION).
      2. Use formal patent language (e.g., "In one embodiment...", "The system comprises...").
      3. Structure: FIELD OF INVENTION, BACKGROUND, SUMMARY OF INVENTION, BRIEF DESCRIPTION OF DRAWINGS, DETAILED DESCRIPTION.
      4. REFERENCE NUMERALS: You MUST include a final section titled "REFERENCE NUMERALS" listing the key components and their assigned numbers (e.g., 10... Housing, 12... Sensor). Ensure these numbers are used consistently throughout the DETAILED DESCRIPTION text (e.g. "The housing (10) contains a sensor (12)...").
      5. DO NOT include Claims or Abstract. Description only.
      6. Ensure UK spelling and grammar.
      7. Length: Comprehensive but concise draft (approx 500-700 words).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    
    // Strip any markdown that the model might have still included despite instructions
    return stripMarkdown(response.text?.trim() || "");
  } catch (e) {
    console.error("Patent draft failed", e);
    return "Error generating patent draft. Please try again.";
  }
};

export const generateSinglePatentFigure = async (description: string, type: 'main' | 'alt' | 'diagram'): Promise<string> => {
    try {
        const ai = getAi();
        let promptBase = "";
        
        if (type === 'main') {
            promptBase = "Technical patent drawing of the MAIN INVENTION described below. Black and white line art on a PLAIN WHITE BACKGROUND. Numbered components matching the description.";
        } else if (type === 'alt') {
            promptBase = "Alternative embodiment technical drawing of the invention described below. Black and white line art on a PLAIN WHITE BACKGROUND.";
        } else {
            promptBase = "Block diagram showing the system components and interactions for the invention described below. Black and white schema on a PLAIN WHITE BACKGROUND.";
        }
        
        const finalPrompt = `
          ${promptBase}
          
          STRICT DRAWING RULES:
          1. STYLE: Pure black line art on plain WHITE background. No shading, no grey, no colour.
          2. LABELS: You MUST include reference numbers (e.g. 10, 12) pointing to parts.
          3. CONSTRAINT: ONLY include reference numbers that are EXPLICITLY mentioned in the provided text. DO NOT invent new numbers. DO NOT include text labels (like "Fig 1" or part names), ONLY the numbers.
          
          CONTEXT (Invention Description): 
          ${description.substring(0, 800)}
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [{ text: finalPrompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: "1:1",
                    imageSize: "1K"
                }
            }
        });

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }
        return "";
    } catch (e) {
        console.error("Single image gen failed", e);
        return "";
    }
}

export const generatePatentFigures = async (description: string): Promise<string[]> => {
    // Generate all 3 sequentially
    const main = await generateSinglePatentFigure(description, 'main');
    const alt = await generateSinglePatentFigure(description, 'alt');
    const diagram = await generateSinglePatentFigure(description, 'diagram');
    return [main, alt, diagram];
};