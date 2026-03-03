<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# শস্য সমাধান (Crop Shomadhan)

A comprehensive crop disease diagnosis application using CABI Plantwise protocols and AI-powered image analysis.

## Features

- AI-powered crop disease diagnosis using Gemini Vision API
- CABI Plantwise protocol-based analysis (IDs 1-120)
- Integrated Plant Doctor Academy with training modules
- Supabase database integration for diagnosis records
- Edge function deployment for serverless data storage
- Bengali language interface
- Reference library for field diagnosis

## Architecture

- **Frontend**: React + TypeScript + Vite
- **AI Analysis**: Google Gemini 3 Flash Preview
- **Database**: Supabase PostgreSQL
- **Backend**: Supabase Edge Functions
- **Styling**: Tailwind CSS

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Database Setup

The application automatically creates the necessary database tables:

- `diagnoses` - Stores all crop disease diagnosis records with RLS enabled

## Edge Functions

- `save-diagnosis` - Handles diagnosis record storage to Supabase

## Training Modules

The Plant Doctor Academy includes:
- Rice disease identification
- Potato late blight protocols
- Mango disease management
- Interactive flashcards and quizzes

View your app in AI Studio: https://ai.studio/apps/drive/11K5l6PcnZlosKB5NL1JaWTCa2V1lcfj2
