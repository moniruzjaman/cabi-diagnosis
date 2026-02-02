
import { GoogleGenAI, Type } from "@google/genai";
import { DiagnosisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_PROMPT = `আপনি একজন বিশেষজ্ঞ কৃষিবিদ এবং CABI Plantwise প্রোটোকল বিশেষজ্ঞ। 
আপনার ডায়াগনোসিস প্রক্রিয়া অবশ্যই নিচের টেকনিক্যাল পয়েন্টগুলো অনুসরণ করবে (সূত্র: Diagnostic Field Guide Data ID 1-120):

১. জীবন্ত বনাম নির্জীব (Biotic vs Abiotic - Page 15):
   - যদি সুস্থ এবং অসুস্থ টিস্যুর মধ্যে একটি 'তীক্ষ্ণ বিভাজন রেখা' (Sharp divide) থাকে, তবে এটি জীবন্ত (Biotic) জীবাণু।
   - যদি পুরো পাতা বা অংশ জুড়ে একটি সাধারণ হলুদ বা বাদামী ভাব থাকে এবং কোনো স্পষ্ট বর্ডার না থাকে, তবে এটি নির্জীব (Abiotic) কারণ (যেমন: পুষ্টির অভাব বা খরা)।

২. নির্দিষ্ট জীবাণু ও লক্ষণ শনাক্তকরণ:
   - ছত্রাক (Fungus): কলা গাছে Fusarium wilt (Page 25) বা আলুর লেট ব্লাইট (Page 35)। পচা দাগের কিনারা গাঢ় হতে পারে (Page 32)।
   - ব্যাকটেরিয়া (Bacteria): ভিজে ভাব (Water-soaked) এবং জ্যামিতিক দাগ (Angular spots)। আলুর ক্ষেত্রে Ralstonia (Page 27)।
   - ভাইরাস (Virus): মোজাইক, রিং স্পট (Citrus ringspot - Page 36) বা পাতা কুঁচকে যাওয়া। ভাইরাস সাধারণত মৃত কোষ (Necrosis) তৈরি করে না (Page 61)।
   - নিমাটোড (Nematode): শিকড়ে গিঁট (Galls) তৈরি করা (Page 58)।

৩. বিয়োগ পদ্ধতি (Elimination Method - Page 15):
   - যদি চিবানোর চিহ্ন বা জালের (Webbing) উপস্থিতি না থাকে, তবে পোকা/মাকড় আক্রমণ বাদ দিন।
   - যদি পোকার মল (Frass) থাকে, তবে এটি পোকা; যা অনেক সময় ছত্রাকের দানার মতো মনে হতে পারে। ধুয়ে ফেললে যদি চলে যায় তবে এটি পোকার মল (Page 34)।

৪. ম্যানেজমেন্ট (Big 5 - Page 74):
   - পরামর্শ অবশ্যই এই ৫টি শর্ত পূরণ করবে: ১. সাশ্রয়ী (Economic), ২. কার্যকর (Effective), ৩. নিরাপদ (Safe), ৪. ব্যবহারিক (Practical) এবং ৫. স্থানীয়ভাবে সহজলভ্য।

৫. পুষ্টির অভাব (Nutrient Deficiency - Page 23, 47-49):
   - নাইট্রোজেন: নিচের দিকের বয়স্ক পাতা হলুদ হওয়া।
   - আয়রন: কচি পাতার শিরার মধ্যবর্তী অংশ হলুদ হওয়া (Page 48)।
   - পটাশিয়াম: পাতার কিনারা পোড়া বা হলুদ হওয়া (Page 38)।

আউটপুট বাংলায় দিন। 'deductionLogic' ফিল্ডে উপরের ১ ও ৩ নম্বর পয়েন্টের ভিত্তিতে আপনার যুক্তির ব্যাখ্যা দিন।`;

export const analyzeCropImage = async (base64Image: string): Promise<DiagnosisResult> => {
  const model = 'gemini-3-flash-preview';
  
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: "CABI Plantwise গাইডবইয়ের ১৩-১২০ সারির তথ্যের আলোকে এই নমুনাটি বিশ্লেষণ করুন এবং বিস্তারিত পরামর্শ দিন।" }
      ]
    },
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          cropName: { type: Type.STRING },
          symptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
          signs: { type: Type.ARRAY, items: { type: Type.STRING } },
          isBiotic: { type: Type.BOOLEAN },
          confidence: { type: Type.NUMBER },
          diseaseName: { type: Type.STRING },
          category: { type: Type.STRING },
          lifecycle: { type: Type.STRING },
          spreadMethod: { type: Type.STRING },
          deductionLogic: { type: Type.STRING },
          management: {
            type: Type.OBJECT,
            properties: {
              cultural: { type: Type.STRING },
              biological: { type: Type.STRING },
              chemical: { type: Type.STRING },
              prevention: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["cultural", "prevention"]
          },
          recommendations: {
            type: Type.OBJECT,
            properties: {
              safe: { type: Type.STRING },
              effective: { type: Type.STRING },
              practical: { type: Type.STRING },
              locallyAvailable: { type: Type.STRING },
              ipmStrategy: { type: Type.STRING }
            },
            required: ["safe", "effective", "practical", "locallyAvailable", "ipmStrategy"]
          }
        },
        required: ["cropName", "symptoms", "isBiotic", "diseaseName", "category", "management", "recommendations", "deductionLogic"]
      }
    }
  });

  const text = response.text || '{}';
  return JSON.parse(text) as DiagnosisResult;
};
