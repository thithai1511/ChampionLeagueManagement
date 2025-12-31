import apiService from '../../layers/application/services/ApiService';

/**
 * Get player avatar URL from API
 * @param {number} playerId - Player ID
 * @returns {Promise<string|null>} Avatar URL or null if not found
 */
export async function getPlayerAvatar(playerId) {
  if (!playerId || !Number.isInteger(playerId)) {
    return null;
  }

  try {
    const response = await apiService.get(`/players/${playerId}/avatar`);
    return response?.avatarUrl || null;
  } catch (error) {
    console.warn(`Failed to fetch avatar for player ${playerId}:`, error);
    return null;
  }
}

/**
 * Batch fetch player avatars
 * @param {number[]} playerIds - Array of player IDs
 * @returns {Promise<Record<number, string|null>>} Map of playerId -> avatarUrl
 */
export async function batchGetPlayerAvatars(playerIds) {
  if (!Array.isArray(playerIds) || playerIds.length === 0) {
    return {};
  }

  // Filter valid IDs
  const validIds = playerIds
    .map(id => typeof id === 'number' ? id : parseInt(String(id), 10))
    .filter(id => !isNaN(id) && id > 0);

  if (validIds.length === 0) {
    return {};
  }

  try {
    console.log('batchGetPlayerAvatars: Calling API with', validIds.length, 'player IDs:', validIds);
    // Use longer timeout for batch requests (11 players * 3s delay = 33s + processing time)
    const response = await apiService.post('/players/avatars/batch', {
      playerIds: validIds
    }, {
      timeout: 120000 // 2 minutes timeout for batch requests
    });
    console.log('batchGetPlayerAvatars: API response:', response);
    // ApiService wraps response in { data: {...} }, so we need response.data.avatars
    const avatars = response?.data?.avatars || response?.avatars || {};
    console.log('batchGetPlayerAvatars: Avatars extracted:', Object.keys(avatars).length, 'avatars');
    return avatars;
  } catch (error) {
    console.error('batchGetPlayerAvatars: Error details:', {
      message: error?.message,
      status: error?.status,
      response: error?.response?.data
    });
    return {};
  }
}

/**
 * Get avatar URL with fallback
 * @param {string|null} avatarUrl - Avatar URL from API
 * @param {string} playerName - Player name for fallback
 * @returns {string} Avatar URL or fallback
 */
export function getAvatarWithFallback(avatarUrl, playerName = '') {
  if (avatarUrl) {
    return avatarUrl;
  }

  // Fallback: Generate initials or use placeholder
  if (playerName) {
    const initials = playerName
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    
    // Return data URI with initials (use safe base64 for Unicode)
    const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#003399"/>
        <text x="50" y="60" text-anchor="middle" fill="white" font-size="40" font-weight="bold" font-family="Arial">${initials}</text>
      </svg>`;
    return `data:image/svg+xml;base64,${safeBtoaUnicode(svg)}`;
  }

  // Default placeholder
  const defaultSvg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#cccccc"/>
      <circle cx="50" cy="50" r="30" fill="#999999"/>
    </svg>`;
  return `data:image/svg+xml;base64,${safeBtoaUnicode(defaultSvg)}`;
}

/**
 * Safely base64-encode a Unicode string by converting to UTF-8 bytes first.
 * @param {string} str
 * @returns {string}
 */
function safeBtoaUnicode(str) {
  if (typeof window === 'undefined' || typeof btoa === 'undefined') {
    // Fallback for non-browser environments
    return Buffer.from(str, 'utf8').toString('base64');
  }

  try {
    return btoa(str);
  } catch (err) {
    // Convert to UTF-8 bytes and then to binary string for btoa
    const utf8 = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < utf8.length; i++) {
      binary += String.fromCharCode(utf8[i]);
    }
    return btoa(binary);
  }
}

