const express = require('express');
const router = express.Router();

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

// ──────────────────────────────────────────────
// Geocoding (Nominatim / OpenStreetMap – free)
// ──────────────────────────────────────────────
async function geocodePlace(placeName, city) {
  const q = encodeURIComponent(`${placeName}, ${city}`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CityDiscoveryApp/1.0 (contact@example.com)' },
    });
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.error('Geocoding error:', err.message);
  }
  return null;
}

async function getCityCenter(city) {
  const q = encodeURIComponent(city);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CityDiscoveryApp/1.0 (contact@example.com)' },
    });
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name.split(',')[0] };
    }
  } catch (err) {
    console.error('City geocoding error:', err.message);
  }
  return null;
}

// ──────────────────────────────────────────────
// Twitter / X API v2
// ──────────────────────────────────────────────
function buildTwitterQuery(city, type) {
  const base = `"${city}" -is:retweet lang:en`;

  const keywords = {
    restaurant: '(restaurant OR cafe OR brunch OR dinner OR lunch OR "food spot" OR bar OR bistro)',
    event:      '(event OR concert OR festival OR "live music" OR show OR exhibition OR popup OR "opening night")',
    activity:   '(things to do OR museum OR park OR hike OR gallery OR tour OR explore OR visit OR "must see")',
    bar:        '(bar OR cocktail OR nightlife OR "happy hour" OR brewery OR rooftop OR lounge)',
    all:        '(restaurant OR event OR concert OR cafe OR bar OR festival OR museum OR "things to do" OR nightlife)',
  };

  return `${base} ${keywords[type] || keywords.all}`;
}

// Extract a possible place name from tweet text using heuristics
function extractPlaceName(text) {
  // Pattern: "at [Capitalized Place]", "in [Capitalized Place]", "visited [Place]"
  const patterns = [
    /\bat\s+([A-Z][A-Za-z0-9'& ]{2,40})(?=[,!.?\n]|$)/,
    /\bvisiting\s+([A-Z][A-Za-z0-9'& ]{2,40})(?=[,!.?\n]|$)/,
    /\bchecked into\s+([A-Z][A-Za-z0-9'& ]{2,40})(?=[,!.?\n]|$)/,
    /\bcheck out\s+([A-Z][A-Za-z0-9'& ]{2,40})(?=[,!.?\n]|$)/,
    /@\w+/,  // fallback: mention (not a place name but shows engagement)
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1] && !['The', 'A', 'An', 'My', 'Our', 'Their'].includes(m[1].trim())) {
      return m[1].trim();
    }
  }

  // Last resort: look for consecutive Title Case words (2–4 words)
  const titleCase = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/g);
  if (titleCase) {
    // Filter out common non-place title-case phrases
    const skip = new Set(['I Am', 'New York', 'Los Angeles']); // city itself would double
    const candidate = titleCase.find(t => !skip.has(t));
    if (candidate) return candidate;
  }

  return null;
}

function classifyType(text) {
  const t = text.toLowerCase();
  if (/restaurant|brunch|dinner|lunch|cafe|bistro|pizza|sushi|tacos|menu|chef/.test(t)) return 'restaurant';
  if (/concert|festival|show|event|live music|exhibition|gallery|popup/.test(t)) return 'event';
  if (/bar|cocktail|nightlife|happy hour|brewery|rooftop|lounge|drinks/.test(t)) return 'bar';
  return 'activity';
}

async function searchTwitter(city, type, day) {
  const query = buildTwitterQuery(city, type);
  const now = new Date();

  // Twitter v2 date range filter
  let startTime;
  if (day === 'today') {
    startTime = new Date(now);
    startTime.setHours(0, 0, 0, 0);
  } else if (day === 'weekend') {
    const dayOfWeek = now.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    startTime = new Date(now);
    startTime.setDate(now.getDate() - Math.min(daysUntilFriday, 2));
    startTime.setHours(0, 0, 0, 0);
  } else {
    // 'week' – last 7 days
    startTime = new Date(now);
    startTime.setDate(now.getDate() - 7);
  }

  const params = new URLSearchParams({
    query,
    max_results: '50',
    'tweet.fields': 'created_at,public_metrics,geo,entities,text',
    'user.fields': 'name,username,profile_image_url',
    'place.fields': 'name,full_name,country,geo,place_type',
    expansions: 'author_id,geo.place_id,attachments.media_keys',
    'media.fields': 'url,preview_image_url',
  });

  if (startTime) params.set('start_time', startTime.toISOString());

  const res = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
    headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Twitter API error ${res.status}: ${JSON.stringify(err)}`);
  }

  return res.json();
}

async function tweetsToPlaces(twitterData, city) {
  const { data: tweets = [], includes = {} } = twitterData;
  const usersMap = Object.fromEntries((includes.users || []).map(u => [u.id, u]));
  const placesMap = Object.fromEntries((includes.places || []).map(p => [p.id, p]));

  const places = [];
  const geocodeCache = {};

  for (const tweet of tweets) {
    const author = usersMap[tweet.author_id] || {};
    let lat = null;
    let lng = null;
    let placeName = null;
    let address = null;

    // Use Twitter geo if available
    if (tweet.geo?.place_id) {
      const tp = placesMap[tweet.geo.place_id];
      if (tp) {
        placeName = tp.name || tp.full_name;
        address = tp.full_name;
        if (tp.geo?.bbox) {
          const [minLng, minLat, maxLng, maxLat] = tp.geo.bbox;
          lat = (minLat + maxLat) / 2;
          lng = (minLng + maxLng) / 2;
        }
      }
    }

    // Try to extract place name from text if we don't have one
    if (!placeName) placeName = extractPlaceName(tweet.text);

    // Geocode if we have a name but no coords
    if (placeName && (!lat || !lng)) {
      const cacheKey = `${placeName}|${city}`;
      if (geocodeCache[cacheKey]) {
        ({ lat, lng } = geocodeCache[cacheKey]);
      } else {
        const coords = await geocodePlace(placeName, city);
        if (coords) {
          ({ lat, lng } = coords);
          geocodeCache[cacheKey] = coords;
        }
      }
    }

    // Skip if we still can't place it
    if (!lat || !lng) continue;

    places.push({
      id: tweet.id,
      name: placeName || 'Unknown Place',
      type: classifyType(tweet.text),
      lat,
      lng,
      description: tweet.text,
      tweetUrl: `https://x.com/i/web/status/${tweet.id}`,
      author: author.name || 'Unknown',
      authorHandle: author.username ? `@${author.username}` : '',
      authorAvatar: author.profile_image_url || null,
      postedAt: tweet.created_at,
      likes: tweet.public_metrics?.like_count ?? 0,
      retweets: tweet.public_metrics?.retweet_count ?? 0,
      address: address || null,
      tags: [],
    });
  }

  return places;
}

// ──────────────────────────────────────────────
// Mock data (used when no Twitter token is set)
// ──────────────────────────────────────────────
const KNOWN_CITIES = {
  'new york':     { lat: 40.7128,  lng: -74.0060,  display: 'New York City' },
  'nyc':          { lat: 40.7128,  lng: -74.0060,  display: 'New York City' },
  'los angeles':  { lat: 34.0522,  lng: -118.2437, display: 'Los Angeles' },
  'la':           { lat: 34.0522,  lng: -118.2437, display: 'Los Angeles' },
  'chicago':      { lat: 41.8781,  lng: -87.6298,  display: 'Chicago' },
  'miami':        { lat: 25.7617,  lng: -80.1918,  display: 'Miami' },
  'san francisco':{ lat: 37.7749,  lng: -122.4194, display: 'San Francisco' },
  'sf':           { lat: 37.7749,  lng: -122.4194, display: 'San Francisco' },
  'austin':       { lat: 30.2672,  lng: -97.7431,  display: 'Austin' },
  'nashville':    { lat: 36.1627,  lng: -86.7816,  display: 'Nashville' },
  'seattle':      { lat: 47.6062,  lng: -122.3321, display: 'Seattle' },
  'boston':       { lat: 42.3601,  lng: -71.0589,  display: 'Boston' },
  'denver':       { lat: 39.7392,  lng: -104.9903, display: 'Denver' },
  'portland':     { lat: 45.5051,  lng: -122.6750, display: 'Portland' },
  'new orleans':  { lat: 29.9511,  lng: -90.0715,  display: 'New Orleans' },
  'atlanta':      { lat: 33.7490,  lng: -84.3880,  display: 'Atlanta' },
  'dallas':       { lat: 32.7767,  lng: -96.7970,  display: 'Dallas' },
  'houston':      { lat: 29.7604,  lng: -95.3698,  display: 'Houston' },
  'phoenix':      { lat: 33.4484,  lng: -112.0740, display: 'Phoenix' },
  'las vegas':    { lat: 36.1699,  lng: -115.1398, display: 'Las Vegas' },
  'london':       { lat: 51.5074,  lng: -0.1278,   display: 'London' },
  'paris':        { lat: 48.8566,  lng: 2.3522,    display: 'Paris' },
  'tokyo':        { lat: 35.6762,  lng: 139.6503,  display: 'Tokyo' },
  'barcelona':    { lat: 41.3851,  lng: 2.1734,    display: 'Barcelona' },
  'berlin':       { lat: 52.5200,  lng: 13.4050,   display: 'Berlin' },
};

function jitter(base, amount = 0.02) {
  return base + (Math.random() - 0.5) * amount * 2;
}

function generateMockPlaces(city, type, day) {
  const key = city.toLowerCase().trim();
  const cityInfo = KNOWN_CITIES[key] || { lat: 40.7128, lng: -74.0060, display: city };

  const dayLabels = { today: 'today', weekend: 'this weekend', week: 'this week' };
  const dayLabel = dayLabels[day] || 'recently';

  const allPlaces = [
    // Restaurants
    {
      id: 'mock-1', name: `${cityInfo.display} Kitchen`, type: 'restaurant',
      lat: jitter(cityInfo.lat), lng: jitter(cityInfo.lng),
      description: `Just had the most incredible tasting menu at ${cityInfo.display} Kitchen ${dayLabel}! Every dish was a work of art. The truffle pasta alone was worth the trip. Highly recommend! 🍽️`,
      tweetUrl: '#', author: 'Food Lover', authorHandle: '@foodie_adventures', authorAvatar: null,
      postedAt: new Date().toISOString(), likes: 342, retweets: 87, address: `Downtown ${cityInfo.display}`, tags: ['food', 'dinner'],
    },
    {
      id: 'mock-2', name: 'The Corner Café', type: 'restaurant',
      lat: jitter(cityInfo.lat), lng: jitter(cityInfo.lng),
      description: `The Corner Café in ${cityInfo.display} is an absolute gem ☕ Best flat white in the city + avocado toast that will change your life. Lines out the door ${dayLabel} but worth every minute.`,
      tweetUrl: '#', author: 'Sarah Chen', authorHandle: '@sarahdrinks', authorAvatar: null,
      postedAt: new Date(Date.now() - 3600000 * 4).toISOString(), likes: 891, retweets: 203, address: null, tags: ['brunch', 'coffee'],
    },
    {
      id: 'mock-3', name: 'Rooftop Brasserie', type: 'restaurant',
      lat: jitter(cityInfo.lat, 0.015), lng: jitter(cityInfo.lng, 0.015),
      description: `Rooftop Brasserie never misses 🥂 Had an amazing dinner with views of all of ${cityInfo.display}. The oysters and cocktails were *chef's kiss*. Perfect for a date night!`,
      tweetUrl: '#', author: 'Alex Rivera', authorHandle: '@alexeats', authorAvatar: null,
      postedAt: new Date(Date.now() - 3600000 * 8).toISOString(), likes: 456, retweets: 112, address: null, tags: ['rooftop', 'dinner', 'views'],
    },
    // Bars
    {
      id: 'mock-4', name: 'The Neon Lounge', type: 'bar',
      lat: jitter(cityInfo.lat), lng: jitter(cityInfo.lng),
      description: `The Neon Lounge is THE spot in ${cityInfo.display} right now 🍸 Insane cocktail menu, great vibes. DJ set was fire ${dayLabel}. Packed but the bartenders are so fast!`,
      tweetUrl: '#', author: 'Marcus J', authorHandle: '@marcus_nights', authorAvatar: null,
      postedAt: new Date(Date.now() - 3600000 * 12).toISOString(), likes: 678, retweets: 156, address: null, tags: ['nightlife', 'cocktails'],
    },
    {
      id: 'mock-5', name: 'Craft Brewery Co.', type: 'bar',
      lat: jitter(cityInfo.lat, 0.012), lng: jitter(cityInfo.lng, 0.012),
      description: `Shoutout to Craft Brewery Co. in ${cityInfo.display} 🍺 Just tried their new seasonal IPA and it slaps. Great outdoor seating, dog-friendly, and the snacks pair perfectly. A must-visit!`,
      tweetUrl: '#', author: 'Beer & Beyond', authorHandle: '@beerandbeyond', authorAvatar: null,
      postedAt: new Date(Date.now() - 3600000 * 6).toISOString(), likes: 234, retweets: 45, address: null, tags: ['beer', 'outdoor'],
    },
    // Events
    {
      id: 'mock-6', name: `${cityInfo.display} Jazz Festival`, type: 'event',
      lat: jitter(cityInfo.lat, 0.01), lng: jitter(cityInfo.lng, 0.01),
      description: `The ${cityInfo.display} Jazz Festival is running ${dayLabel} and it is MAGICAL 🎷 Free admission, live music all day, food vendors from local restaurants. Bring a blanket and enjoy!`,
      tweetUrl: '#', author: 'City Events', authorHandle: '@cityevents_official', authorAvatar: null,
      postedAt: new Date(Date.now() - 3600000 * 2).toISOString(), likes: 1240, retweets: 567, address: 'City Park', tags: ['music', 'festival', 'free'],
    },
    {
      id: 'mock-7', name: 'Gallery 21', type: 'event',
      lat: jitter(cityInfo.lat, 0.008), lng: jitter(cityInfo.lng, 0.018),
      description: `Gallery 21 opens its new exhibition ${dayLabel}! Local artists, mixed media installations, and a gorgeous outdoor sculpture garden. The opening reception was 🔥 Don't sleep on this, ${cityInfo.display}!`,
      tweetUrl: '#', author: 'Art Scene', authorHandle: '@artscene_daily', authorAvatar: null,
      postedAt: new Date(Date.now() - 3600000 * 5).toISOString(), likes: 389, retweets: 98, address: null, tags: ['art', 'gallery', 'opening'],
    },
    {
      id: 'mock-8', name: 'The Velvet Room', type: 'event',
      lat: jitter(cityInfo.lat, 0.014), lng: jitter(cityInfo.lng, 0.009),
      description: `Just got back from the pop-up concert at The Velvet Room in ${cityInfo.display} 🎸 Incredible indie band, intimate venue, only 200 capacity. These are the nights you remember. Check their IG for upcoming shows!`,
      tweetUrl: '#', author: 'Live Music Fan', authorHandle: '@livemusic_fan', authorAvatar: null,
      postedAt: new Date(Date.now() - 3600000 * 9).toISOString(), likes: 512, retweets: 134, address: null, tags: ['music', 'indie', 'concert'],
    },
    // Activities
    {
      id: 'mock-9', name: `${cityInfo.display} Botanical Garden`, type: 'activity',
      lat: jitter(cityInfo.lat, 0.018), lng: jitter(cityInfo.lng, 0.022),
      description: `Spent the morning at the ${cityInfo.display} Botanical Garden and it is absolutely stunning right now 🌸 Everything is in bloom. The Japanese garden section is peaceful and so beautiful. Go!`,
      tweetUrl: '#', author: 'Nature Walks', authorHandle: '@naturewalks', authorAvatar: null,
      postedAt: new Date(Date.now() - 3600000 * 3).toISOString(), likes: 723, retweets: 189, address: null, tags: ['nature', 'garden', 'outdoor'],
    },
    {
      id: 'mock-10', name: 'The History Museum', type: 'activity',
      lat: jitter(cityInfo.lat, 0.01), lng: jitter(cityInfo.lng, 0.013),
      description: `The History Museum in ${cityInfo.display} just opened a new exhibit on local street art history — it's incredible! Interactive, immersive, and only $12 to get in. Perfect rainy day activity 🎨`,
      tweetUrl: '#', author: 'Weekend Explorer', authorHandle: '@weekendexplorer', authorAvatar: null,
      postedAt: new Date(Date.now() - 3600000 * 7).toISOString(), likes: 445, retweets: 102, address: null, tags: ['museum', 'history', 'art'],
    },
    {
      id: 'mock-11', name: 'Waterfront Park', type: 'activity',
      lat: jitter(cityInfo.lat, 0.022), lng: jitter(cityInfo.lng, 0.016),
      description: `Waterfront Park in ${cityInfo.display} is so underrated ${dayLabel} ☀️ Kayak rentals, food trucks, live music on weekends. Brought the whole family and everyone had a blast. Free parking too!`,
      tweetUrl: '#', author: 'Family Days Out', authorHandle: '@familydaysout', authorAvatar: null,
      postedAt: new Date(Date.now() - 3600000 * 11).toISOString(), likes: 892, retweets: 234, address: null, tags: ['park', 'outdoor', 'family'],
    },
    {
      id: 'mock-12', name: 'Night Market', type: 'activity',
      lat: jitter(cityInfo.lat, 0.007), lng: jitter(cityInfo.lng, 0.011),
      description: `Night Market is back in ${cityInfo.display} every Friday! 40+ vendors, street food from all over the world, live DJ, and the most amazing vibe. Free entry, runs till midnight 🌙`,
      tweetUrl: '#', author: 'Street Eats', authorHandle: '@streeteatsblog', authorAvatar: null,
      postedAt: new Date(Date.now() - 3600000 * 1).toISOString(), likes: 1567, retweets: 423, address: null, tags: ['market', 'food', 'nightlife'],
    },
  ];

  const typeFilter = type === 'all' ? allPlaces : allPlaces.filter(p => p.type === type);
  return {
    city: cityInfo,
    places: typeFilter,
    source: 'mock',
    notice: 'Showing demo data. Set TWITTER_BEARER_TOKEN on the server to fetch real X/Twitter posts.',
  };
}

// ──────────────────────────────────────────────
// Route handler
// ──────────────────────────────────────────────
router.get('/places', async (req, res) => {
  const { city, type = 'all', day = 'today' } = req.query;
  if (!city || !city.trim()) {
    return res.status(400).json({ error: 'city query parameter is required' });
  }

  // No Twitter token → return mock data immediately
  if (!TWITTER_BEARER_TOKEN) {
    return res.json(generateMockPlaces(city.trim(), type, day));
  }

  // Real Twitter path
  try {
    const twitterData = await searchTwitter(city.trim(), type, day);

    // Get city center for the map
    let cityCenter = KNOWN_CITIES[city.toLowerCase().trim()];
    if (!cityCenter) cityCenter = await getCityCenter(city.trim());

    const places = await tweetsToPlaces(twitterData, city.trim());

    // If we got no geocodable places, fall back to mock but indicate it
    if (places.length === 0) {
      const mock = generateMockPlaces(city.trim(), type, day);
      mock.notice = 'No geolocatable tweets found — showing demo data alongside your search.';
      return res.json({ ...mock, city: cityCenter || mock.city });
    }

    res.json({
      city: cityCenter || { lat: places[0].lat, lng: places[0].lng, display: city },
      places,
      source: 'twitter',
    });
  } catch (err) {
    console.error('Twitter search failed:', err.message);
    // Graceful fallback to mock data
    const mock = generateMockPlaces(city.trim(), type, day);
    mock.notice = `Twitter API error — showing demo data. (${err.message})`;
    return res.json(mock);
  }
});

module.exports = router;
