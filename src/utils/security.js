/**
 * Input sanitization and validation utilities for security
 */

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - Raw user input
 * @returns {string} - Sanitized input
 */
export const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove script tags and javascript: protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+=/gi, '');
  
  // Encode special characters
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  sanitized = sanitized.replace(/[&<>"'/]/g, (char) => map[char]);
  
  return sanitized.trim();
};

/**
 * Detect potential prompt injection attempts
 * @param {string} text - User input text
 * @returns {boolean} - True if injection detected
 */
export const detectPromptInjection = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const injectionPatterns = [
    /ignore\s+previous\s+instructions/i,
    /forget\s+all\s+previous/i,
    /you\s+are\s+now\s+in\s+developer\s+mode/i,
    /bypass\s+safety\s+filters/i,
    /override\s+system\s+prompt/i,
    /act\s+as\s+an?\s+unfiltered/i,
    /disregard\s+all\s+rules/i,
    /print\s+your\s+system\s+instruction/i,
    /what\s+is\s+your\s+system\s+prompt/i,
    /show\s+me\s+your\s+instructions/i,
    /\bsystem\b.*\bmessage\b/i,
    /roleplay.*without.*restriction/i,
    /pretend.*no.*ethical/i
  ];
  
  return injectionPatterns.some(pattern => pattern.test(text));
};

/**
 * Validate symptom description for diagnosis
 * @param {string} symptoms - Symptom description
 * @returns {{valid: boolean, message?: string}} - Validation result
 */
export const validateSymptoms = (symptoms) => {
  if (!symptoms || typeof symptoms !== 'string') {
    return { valid: false, message: 'Symptoms are required' };
  }
  
  const trimmed = symptoms.trim();
  
  if (trimmed.length < 5) {
    return { valid: false, message: 'Please provide more detailed symptoms' };
  }
  
  if (trimmed.length > 1000) {
    return { valid: false, message: 'Symptom description is too long' };
  }
  
  // Check for prompt injection
  if (detectPromptInjection(trimmed)) {
    return { 
      valid: false, 
      message: 'Invalid input detected. Please describe your crop symptoms clearly.' 
    };
  }
  
  // Check for excessive special characters (potential attack)
  const specialCharRatio = (trimmed.match(/[^a-zA-Z0-9\s.,\-_]/g) || []).length / trimmed.length;
  if (specialCharRatio > 0.3) {
    return { valid: false, message: 'Invalid character sequence detected' };
  }
  
  return { valid: true };
};

/**
 * Validate diagnosis messages
 * @param {Array} messages - Chat messages array
 * @returns {{valid: boolean, message?: string}} - Validation result
 */
export const validateDiagnoseMessages = (messages) => {
  if (!Array.isArray(messages)) {
    return { valid: false, message: 'Invalid message format' };
  }
  
  if (messages.length === 0) {
    return { valid: false, message: 'No messages provided' };
  }
  
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  
  if (!lastUserMessage || !lastUserMessage.content) {
    return { valid: false, message: 'No user message found' };
  }
  
  return validateSymptoms(lastUserMessage.content);
};

/**
 * Rate limit configuration
 */
export const RATE_LIMITS = {
  ANONYMOUS: {
    requests: 10,
    windowMs: 60 * 1000 // 1 minute
  },
  AUTHENTICATED: {
    requests: 30,
    windowMs: 60 * 1000 // 1 minute
  },
  API: {
    requests: 100,
    windowMs: 60 * 1000 // 1 minute
  }
};

/**
 * Extract user identifier from request for rate limiting
 * @param {Object} req - Express request object
 * @returns {string} - User identifier
 */
export const getUserIdentifier = (req) => {
  // Try JWT token first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      // Simple JWT decode (payload only, no verification here)
      const base64Url = token.split('.')[1];
      if (base64Url) {
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        if (payload.sub) {
          return `user:${payload.sub}`;
        }
      }
    } catch {
      // Invalid token, fall back to IP
    }
  }
  
  // Fall back to IP address
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
  return `ip:${ip || 'unknown'}`;
};

/**
 * Get rate limit tier based on authentication
 * @param {Object} req - Express request object
 * @returns {Object} - Rate limit configuration
 */
export const getRateLimitTier = (req) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return RATE_LIMITS.AUTHENTICATED;
  }
  
  return RATE_LIMITS.ANONYMOUS;
};
