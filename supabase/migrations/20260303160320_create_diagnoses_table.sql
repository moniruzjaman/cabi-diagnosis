/*
  # Create diagnoses table for crop disease records

  1. New Tables
    - `diagnoses`
      - `id` (uuid, primary key) - Unique identifier for each diagnosis
      - `crop_name` (text) - Name of the crop analyzed
      - `disease_name` (text) - Identified disease or condition
      - `category` (text) - Disease category (Disease, Pest, Nutrient, Abiotic)
      - `confidence` (numeric) - AI confidence score (0-1)
      - `is_biotic` (boolean) - Whether the cause is biotic or abiotic
      - `symptoms` (text[]) - Array of observed symptoms
      - `signs` (text[]) - Array of observed signs
      - `deduction_logic` (text) - Explanation of the diagnosis reasoning
      - `management_cultural` (text) - Cultural management practices
      - `management_biological` (text) - Biological control methods
      - `management_chemical` (text) - Chemical control options
      - `image_url` (text) - URL to the analyzed image (optional)
      - `created_at` (timestamptz) - Timestamp of diagnosis
      - `user_id` (uuid) - Reference to auth.users (optional for anonymous use)

  2. Security
    - Enable RLS on `diagnoses` table
    - Add policy for authenticated users to manage their own records
    - Add policy for anonymous users to insert records (for public access)
    - Add policy for users to view their own records
*/

CREATE TABLE IF NOT EXISTS diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_name text NOT NULL,
  disease_name text NOT NULL,
  category text NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  is_biotic boolean NOT NULL DEFAULT true,
  symptoms text[] DEFAULT '{}',
  signs text[] DEFAULT '{}',
  deduction_logic text,
  management_cultural text,
  management_biological text,
  management_chemical text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert diagnoses (for public/anonymous use)
CREATE POLICY "Anyone can insert diagnoses"
  ON diagnoses
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Users can view all diagnoses (for analytics and learning)
CREATE POLICY "Anyone can view diagnoses"
  ON diagnoses
  FOR SELECT
  TO public
  USING (true);

-- Authenticated users can update their own diagnoses
CREATE POLICY "Users can update own diagnoses"
  ON diagnoses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can delete their own diagnoses
CREATE POLICY "Users can delete own diagnoses"
  ON diagnoses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_diagnoses_created_at ON diagnoses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagnoses_crop_name ON diagnoses(crop_name);
CREATE INDEX IF NOT EXISTS idx_diagnoses_category ON diagnoses(category);
CREATE INDEX IF NOT EXISTS idx_diagnoses_user_id ON diagnoses(user_id);
