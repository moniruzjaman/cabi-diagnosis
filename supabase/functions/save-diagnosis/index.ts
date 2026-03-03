import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DiagnosisRequest {
  cropName: string;
  diseaseName: string;
  category: string;
  confidence: number;
  isBiotic: boolean;
  symptoms: string[];
  signs: string[];
  deductionLogic: string;
  management: {
    cultural: string;
    biological?: string;
    chemical?: string;
  };
  imageData?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const data: DiagnosisRequest = await req.json();

    const record = {
      crop_name: data.cropName,
      disease_name: data.diseaseName,
      category: data.category,
      confidence: data.confidence,
      is_biotic: data.isBiotic,
      symptoms: data.symptoms,
      signs: data.signs,
      deduction_logic: data.deductionLogic,
      management_cultural: data.management.cultural,
      management_biological: data.management.biological || null,
      management_chemical: data.management.chemical || null,
    };

    const { data: result, error } = await supabase
      .from("diagnoses")
      .insert(record)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: result.id,
        message: "Diagnosis saved successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
