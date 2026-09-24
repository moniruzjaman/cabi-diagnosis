import { getVisitorStats } from './analytics.js';
import { handleCORSPreflight, setCORSHeaders } from './_lib/cors.js';

export default async function handler(req, res) {
  // Enable CORS
  if (handleCORSPreflight(req, res, 'GET, OPTIONS')) return;
  setCORSHeaders(req, res, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get visitor ID from query param or generate one
    let visitorId = req.query.visitorId;
    
    if (!visitorId) {
      visitorId = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    }

    // Fetch visitor stats from storage
    const stats = await getVisitorStats(visitorId);
    
    // Try to get user email from session/cookies if available
    // For now, we'll return empty email - can be extended with auth
    let email = '';
    
    // Check for email in query params (passed from client)
    if (req.query.email) {
      email = req.query.email;
    }

    res.status(200).json({
      visitorId,
      visitorStats: stats,
      email
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    // Return basic response even on error
    res.status(200).json({
      visitorId: req.query.visitorId || '',
      visitorStats: { visits: 1, sections: {}, totalVisits: 1, uniqueVisitors: 1 },
      email: ''
    });
  }
}
