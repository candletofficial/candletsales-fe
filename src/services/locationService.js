/**
 * locationService.js
 * Tích hợp bản đồ cho CandletShop — hệ thống ưu tiên + fallback thông minh
 *
 * Thứ tự ưu tiên:
 * 1. Goong Maps API (nếu có key) — dữ liệu VN chuẩn nhất, tốt nhất cho gợi ý địa chỉ
 * 2. Photon (OpenStreetMap, không cần key) — fallback autocomplete
 * 3. Nominatim (OpenStreetMap, không cần key) — fallback geocoding chính xác
 * 4. OSRM (không cần key) — fallback tính khoảng cách đường bộ
 * 5. Haversine × 1.25 — fallback cuối cùng tính khoảng cách
 *
 * Đăng ký Goong Maps MIỄN PHÍ (30.000 req/tháng, không cần thẻ tín dụng):
 * https://account.goong.io/
 */

import systemConfigService from './systemConfigService';

const PROVINCES_API_BASE    = 'https://provinces.open-api.vn/api';
const PROVINCES_V2_API_BASE = 'https://provinces.open-api.vn/api/v2';
const GOONG_API_BASE        = 'https://rsapi.goong.io';
const PHOTON_API_BASE       = 'https://photon.komoot.io/api';
const NOMINATIM_API_BASE    = 'https://nominatim.openstreetmap.org';
const OSRM_API_BASE         = 'https://router.project-osrm.org/route/v1/driving';

const NOMINATIM_HEADERS = {
  'Accept-Language': 'vi,en;q=0.9',
  'User-Agent': 'CandletShop/1.0 (vietnam ecommerce)'
};

// Bảng tọa độ GPS trung tâm của 63 Tỉnh/Thành phố Việt Nam
export const PROVINCE_COORDINATES = {
  'Hà Nội': { lat: 21.0285, lng: 105.8542 },
  'Thành phố Hà Nội': { lat: 21.0285, lng: 105.8542 },
  'Hồ Chí Minh': { lat: 10.8231, lng: 106.6297 },
  'Thành phố Hồ Chí Minh': { lat: 10.8231, lng: 106.6297 },
  'Đà Nẵng': { lat: 16.0544, lng: 108.2022 },
  'Thành phố Đà Nẵng': { lat: 16.0544, lng: 108.2022 },
  'Hải Phòng': { lat: 20.8449, lng: 106.6881 },
  'Thành phố Hải Phòng': { lat: 20.8449, lng: 106.6881 },
  'Cần Thơ': { lat: 10.0452, lng: 105.7469 },
  'Thành phố Cần Thơ': { lat: 10.0452, lng: 105.7469 },
  'An Giang': { lat: 10.5216, lng: 105.1259 },
  'Bà Rịa - Vũng Tàu': { lat: 10.5425, lng: 107.2429 },
  'Bắc Giang': { lat: 21.2731, lng: 106.1946 },
  'Bắc Kạn': { lat: 22.1471, lng: 105.8348 },
  'Bạc Liêu': { lat: 9.2941, lng: 105.7278 },
  'Bắc Ninh': { lat: 21.1861, lng: 106.0763 },
  'Bến Tre': { lat: 10.2434, lng: 106.3753 },
  'Bình Định': { lat: 13.7830, lng: 109.2197 },
  'Bình Dương': { lat: 11.1606, lng: 106.6534 },
  'Bình Phước': { lat: 11.7511, lng: 106.9036 },
  'Bình Thuận': { lat: 11.0903, lng: 108.0722 },
  'Cà Mau': { lat: 9.1769, lng: 105.1524 },
  'Cao Bằng': { lat: 22.6666, lng: 106.2639 },
  'Đắk Lắk': { lat: 12.6667, lng: 108.0383 },
  'Đắk Nông': { lat: 12.0041, lng: 107.6875 },
  'Điện Biên': { lat: 21.3860, lng: 103.0230 },
  'Đồng Nai': { lat: 11.0355, lng: 107.1866 },
  'Đồng Tháp': { lat: 10.4578, lng: 105.6335 },
  'Gia Lai': { lat: 13.9833, lng: 108.0000 },
  'Hà Giang': { lat: 22.8233, lng: 104.9836 },
  'Hà Nam': { lat: 20.5835, lng: 105.9234 },
  'Hà Tĩnh': { lat: 18.3560, lng: 105.9058 },
  'Hải Dương': { lat: 20.9373, lng: 106.3146 },
  'Hậu Giang': { lat: 9.7845, lng: 105.4701 },
  'Hòa Bình': { lat: 20.8171, lng: 105.3376 },
  'Hưng Yên': { lat: 20.6464, lng: 106.0511 },
  'Khánh Hòa': { lat: 12.2388, lng: 109.1967 },
  'Kiên Giang': { lat: 10.0125, lng: 105.0809 },
  'Kon Tum': { lat: 14.3497, lng: 108.0002 },
  'Lai Châu': { lat: 22.3964, lng: 103.4684 },
  'Lâm Đồng': { lat: 11.9404, lng: 108.4583 },
  'Lạng Sơn': { lat: 21.8537, lng: 106.7620 },
  'Lào Cai': { lat: 22.4856, lng: 103.9707 },
  'Long An': { lat: 10.5367, lng: 106.4116 },
  'Nam Định': { lat: 20.4344, lng: 106.1773 },
  'Nghệ An': { lat: 18.6734, lng: 105.6813 },
  'Ninh Bình': { lat: 20.2506, lng: 105.9745 },
  'Ninh Thuận': { lat: 11.5643, lng: 108.9882 },
  'Phú Thọ': { lat: 21.3228, lng: 105.4019 },
  'Phú Yên': { lat: 13.0882, lng: 109.3175 },
  'Quảng Bình': { lat: 17.4690, lng: 106.6223 },
  'Quảng Nam': { lat: 15.5394, lng: 108.0267 },
  'Quảng Ngãi': { lat: 15.1205, lng: 108.7923 },
  'Quảng Ninh': { lat: 20.9505, lng: 107.0734 },
  'Quảng Trị': { lat: 16.8163, lng: 107.1001 },
  'Sóc Trăng': { lat: 9.6033, lng: 105.9800 },
  'Sơn La': { lat: 21.3283, lng: 103.9148 },
  'Tây Ninh': { lat: 11.3101, lng: 106.0988 },
  'Thái Bình': { lat: 20.4463, lng: 106.3366 },
  'Thái Nguyên': { lat: 21.5942, lng: 105.8482 },
  'Thanh Hóa': { lat: 19.8067, lng: 105.7852 },
  'Thừa Thiên Huế': { lat: 16.4637, lng: 107.5909 },
  'Tiền Giang': { lat: 10.3600, lng: 106.3600 },
  'Trà Vinh': { lat: 9.9347, lng: 106.3455 },
  'Tuyên Quang': { lat: 21.8234, lng: 105.2180 },
  'Vĩnh Long': { lat: 10.2537, lng: 105.9722 },
  'Vĩnh Phúc': { lat: 21.3089, lng: 105.6049 },
  'Yên Bái': { lat: 21.7168, lng: 104.8975 }
};

// Runtime cache cho Goong API Key
let cachedGoongKey = null;
let isKeyLoaded    = false;

export const locationService = {

  // ─────────────────────────────────────────────────────────────
  //  GOONG API KEY MANAGEMENT
  // ─────────────────────────────────────────────────────────────

  setGoongApiKey(key) {
    if (typeof key === 'string') {
      cachedGoongKey = key.trim();
      try {
        cachedGoongKey
          ? sessionStorage.setItem('candlet_goong_api_key', cachedGoongKey)
          : sessionStorage.removeItem('candlet_goong_api_key');
      } catch (e) {}
    }
  },

  async getGoongApiKey() {
    if (cachedGoongKey) return cachedGoongKey;

    // 1. sessionStorage
    try {
      const stored = sessionStorage.getItem('candlet_goong_api_key');
      if (stored) { cachedGoongKey = stored; return stored; }
    } catch (e) {}

    // 2. Biến môi trường Vite
    const envKey = import.meta.env.VITE_GOONG_API_KEY;
    if (envKey && envKey !== 'YOUR_GOONG_API_KEY' && envKey.trim().length > 5) {
      cachedGoongKey = envKey.trim();
      return cachedGoongKey;
    }

    // 3. Backend SystemConfig (chỉ tải 1 lần)
    if (!isKeyLoaded) {
      isKeyLoaded = true;
      try {
        const res = await systemConfigService.getConfig('goong_api_key');
        if (res?.data?.value && typeof res.data.value === 'string' && res.data.value.trim().length > 5) {
          cachedGoongKey = res.data.value.trim();
          try { sessionStorage.setItem('candlet_goong_api_key', cachedGoongKey); } catch (e) {}
          return cachedGoongKey;
        }
      } catch (err) {}
    }

    return null;
  },

  async testGoongKey(apiKey) {
    const keyToTest = apiKey || await this.getGoongApiKey();
    if (!keyToTest) return { success: false, message: 'Chưa nhập Goong API Key' };
    try {
      const url = `${GOONG_API_BASE}/Place/AutoComplete?api_key=${encodeURIComponent(keyToTest)}&input=Hà Nội&limit=1`;
      const res  = await fetch(url);
      const data = await res.json();
      if (res.ok && (data.status === 'OK' || Array.isArray(data.predictions))) {
        return { success: true, message: 'Kết nối Goong Maps API thành công!' };
      }
      return { success: false, message: data.error_message || `Lỗi Goong API (${data.status || res.status})` };
    } catch (err) {
      return { success: false, message: `Lỗi kết nối mạng: ${err.message}` };
    }
  },

  // ─────────────────────────────────────────────────────────────
  //  GOONG MAPS (Primary — khi có API key)
  // ─────────────────────────────────────────────────────────────

  async goongAutoComplete(input, locationCoords = null) {
    const key = await this.getGoongApiKey();
    if (!key || !input || input.trim().length < 2) return null;
    try {
      let url = `${GOONG_API_BASE}/Place/AutoComplete?api_key=${encodeURIComponent(key)}&input=${encodeURIComponent(input.trim())}&limit=7`;
      if (locationCoords?.lat && locationCoords?.lng) {
        url += `&location=${locationCoords.lat},${locationCoords.lng}&radius=30`;
      }
      const res  = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.predictions && Array.isArray(data.predictions)) {
        return data.predictions.map(item => ({
          placeId:     item.place_id,
          title:       item.structured_formatting?.main_text || item.description,
          subtitle:    item.structured_formatting?.secondary_text || item.description,
          description: item.description,
          source:      'goong'
        }));
      }
    } catch (err) {
      console.warn('Goong AutoComplete error:', err);
    }
    return null;
  },

  async goongPlaceDetail(placeId) {
    const key = await this.getGoongApiKey();
    if (!key || !placeId) return null;
    try {
      const url  = `${GOONG_API_BASE}/Place/Detail?place_id=${encodeURIComponent(placeId)}&api_key=${encodeURIComponent(key)}`;
      const res  = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.result) {
        const { geometry, name, formatted_address, place_id, compound, address_components } = data.result;
        return {
          placeId: place_id,
          name,
          formattedAddress: formatted_address,
          lat:  geometry?.location?.lat,
          lng:  geometry?.location?.lng,
          compound: {
            province: compound?.province || '',
            district: compound?.district || '',
            commune:  compound?.commune  || ''
          },
          addressComponents: address_components || []
        };
      }
    } catch (err) {
      console.warn('Goong Place Detail error:', err);
    }
    return null;
  },

  async goongDistanceMatrix(originCoord, destCoord, vehicle = 'bike') {
    const key = await this.getGoongApiKey();
    if (!key || !originCoord?.lat || !destCoord?.lat) return null;
    try {
      const url  = `${GOONG_API_BASE}/DistanceMatrix?origins=${originCoord.lat},${originCoord.lng}&destinations=${destCoord.lat},${destCoord.lng}&vehicle=${vehicle}&api_key=${encodeURIComponent(key)}`;
      const res  = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.rows?.[0]?.elements?.[0]?.status === 'OK') {
        const elem = data.rows[0].elements[0];
        return {
          distanceKm:     Number((elem.distance.value / 1000).toFixed(1)),
          distanceMeters: elem.distance.value,
          distanceText:   elem.distance.text,
          isGoong:        true
        };
      }
    } catch (err) {
      console.warn('Goong Distance Matrix error:', err);
    }
    return null;
  },

  // ─────────────────────────────────────────────────────────────
  //  AUTOCOMPLETE — Ưu tiên Goong → fallback Photon + Nominatim
  // ─────────────────────────────────────────────────────────────

  /**
   * Gợi ý địa chỉ cụ thể được lọc theo khu vực hành chính đã chọn
   * (Giống app giao hàng: gợi ý đúng số nhà, tên đường trong quận/phường đó)
   */
  async searchPlacesScoped(streetQuery, areaContext = {}, biasCoords = null) {
    if (!streetQuery || streetQuery.trim().length < 1) return [];

    const cleanStreet = streetQuery.trim();
    const { provinceName, districtName, wardName } = areaContext;

    // Xây dựng combined query gắn với khu vực
    const contextParts = [cleanStreet];
    if (wardName)     contextParts.push(wardName);
    if (districtName) contextParts.push(districtName);
    if (provinceName) contextParts.push(provinceName);
    const combinedQuery = contextParts.join(', ');

    // ── Ưu tiên 1: Goong Maps (chuẩn xác nhất cho VN) ──────────
    try {
      const goong = await this.goongAutoComplete(combinedQuery, biasCoords);
      if (goong && goong.length > 0) return goong;

      // Fallback Goong ngắn hơn
      if (districtName || provinceName) {
        const shortQuery = `${cleanStreet}, ${districtName || provinceName}`;
        const goong2 = await this.goongAutoComplete(shortQuery, biasCoords);
        if (goong2 && goong2.length > 0) return goong2;
      }
    } catch (e) {}

    // ── Ưu tiên 2: Nominatim structured search (khi có province) ─
    if (provinceName) {
      const nominatimResults = await this._nominatimStructuredSearch(cleanStreet, {
        county:  districtName || '',
        state:   provinceName,
      });
      if (nominatimResults && nominatimResults.length > 0) return nominatimResults;
    }

    // ── Ưu tiên 3: Photon với context ───────────────────────────
    const photon = await this._photonSearch(combinedQuery, biasCoords);
    if (photon && photon.length > 0) return photon;

    // ── Ưu tiên 4: Photon chỉ street + province ─────────────────
    return this._photonSearch(
      [cleanStreet, provinceName, 'Việt Nam'].filter(Boolean).join(', '),
      biasCoords
    );
  },

  /**
   * Tìm kiếm địa điểm chung (không cần context khu vực)
   */
  async searchPlaces(query, biasCoords = null) {
    if (!query || query.trim().length < 2) return [];

    // Goong trước
    try {
      const goong = await this.goongAutoComplete(query, biasCoords);
      if (goong && goong.length > 0) return goong;
    } catch (e) {}

    // Photon fallback
    return this._photonSearch(query, biasCoords);
  },

  // ─────────────────────────────────────────────────────────────
  //  PHOTON — Fallback autocomplete (OpenStreetMap, không key)
  // ─────────────────────────────────────────────────────────────

  async _photonSearch(query, biasCoords = null) {
    try {
      let url = `${PHOTON_API_BASE}/?q=${encodeURIComponent(query.trim())}&limit=8&lang=vi`;
      if (biasCoords?.lat && biasCoords?.lng) {
        url += `&lat=${biasCoords.lat}&lon=${biasCoords.lng}`;
      } else {
        url += `&lat=21.0285&lon=105.8542`;
      }

      const res  = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data?.features) return [];

      const all      = data.features;
      const vnPlaces = all.filter(f => {
        const p = f.properties;
        return p.countrycode === 'VN' || p.country === 'Việt Nam' || p.country === 'Vietnam';
      });
      const list = vnPlaces.length > 0 ? vnPlaces : all.slice(0, 5);

      return list.map(f => {
        const p        = f.properties;
        const [lng, lat] = f.geometry.coordinates;
        const title    = p.name
          || [p.housenumber, p.street].filter(Boolean).join(' ')
          || p.street
          || 'Địa điểm';

        const subtitleParts = [
          p.housenumber && p.name ? [p.housenumber, p.street].filter(Boolean).join(' ') : p.street,
          p.suburb || p.quarter,
          p.district || p.locality,
          p.city || p.county,
          p.state,
        ].filter(Boolean);

        return {
          title,
          subtitle:    [...new Set(subtitleParts)].join(', ') || 'Việt Nam',
          description: [title, [...new Set(subtitleParts)].join(', ')].filter(Boolean).join(', '),
          lat,
          lng,
          source:      'photon',
          rawProperties: p
        };
      });
    } catch (err) {
      console.warn('Photon search error:', err);
      return [];
    }
  },

  // ─────────────────────────────────────────────────────────────
  //  NOMINATIM STRUCTURED SEARCH (chính xác khi có context khu vực)
  // ─────────────────────────────────────────────────────────────

  async _nominatimStructuredSearch(street, { county = '', state = '' } = {}) {
    try {
      const params = new URLSearchParams({
        street:     street,
        country:    'Vietnam',
        format:     'json',
        addressdetails: '1',
        limit:      '8',
        countrycodes: 'vn',
        'accept-language': 'vi'
      });
      if (county) params.set('county', county);
      if (state)  params.set('state',  state);

      const url = `${NOMINATIM_API_BASE}/search?${params.toString()}`;
      const res = await fetch(url, { headers: NOMINATIM_HEADERS });
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) return [];

      return data.map(item => {
        const addr = item.address || {};
        const title = [
          addr.house_number,
          addr.road || addr.pedestrian || addr.footway
        ].filter(Boolean).join(' ') || item.display_name.split(',')[0];

        const subtitleParts = [
          addr.suburb || addr.neighbourhood || addr.quarter,
          addr.city_district || addr.district,
          addr.city || addr.county || addr.state,
        ].filter(Boolean);

        return {
          title,
          subtitle:    subtitleParts.join(', ') || 'Việt Nam',
          description: item.display_name,
          lat:         parseFloat(item.lat),
          lng:         parseFloat(item.lon),
          source:      'nominatim'
        };
      });
    } catch (err) {
      console.warn('Nominatim structured search error:', err);
      return [];
    }
  },

  // ─────────────────────────────────────────────────────────────
  //  GEOCODING — Goong → Nominatim → Photon
  // ─────────────────────────────────────────────────────────────

  async geocodeAddress(fullAddress, fallbackGeneralAddress = '') {
    if (!fullAddress || typeof fullAddress !== 'string') return null;

    // 1. Goong Forward Geocoding
    const key = await this.getGoongApiKey();
    if (key) {
      try {
        const url  = `${GOONG_API_BASE}/geocode?address=${encodeURIComponent(fullAddress)}&api_key=${encodeURIComponent(key)}`;
        const res  = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data?.results?.[0]?.geometry?.location) {
            const { lat, lng } = data.results[0].geometry.location;
            return { lat, lng, displayName: data.results[0].formatted_address || fullAddress, source: 'goong' };
          }
        }
      } catch (e) {}
    }

    const tryNominatim = async (query) => {
      try {
        const q   = query.includes('Vietnam') || query.includes('Việt Nam') ? query : `${query}, Vietnam`;
        const url = `${NOMINATIM_API_BASE}/search?q=${encodeURIComponent(q)}&format=json&limit=3&countrycodes=vn&accept-language=vi`;
        const res = await fetch(url, { headers: NOMINATIM_HEADERS });
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name || query, source: 'nominatim' };
        }
      } catch (err) {}
      return null;
    };

    const tryPhoton = async (query) => {
      const results = await this._photonSearch(query, null);
      if (results?.length > 0) return { lat: results[0].lat, lng: results[0].lng, displayName: results[0].description || query, source: 'photon' };
      return null;
    };

    // 2. Nominatim
    let result = await tryNominatim(fullAddress);
    if (result) return result;

    // 3. Photon (song song cho tốc độ tốt hơn Nominatim rate-limit)
    result = await tryPhoton(fullAddress);
    if (result) return result;

    // 4. Fallback address
    if (fallbackGeneralAddress && fallbackGeneralAddress !== fullAddress) {
      result = await tryNominatim(fallbackGeneralAddress);
      if (result) return result;
    }

    // 5. Fallback cuối cùng: Nhận diện Tỉnh/Thành từ chuỗi địa chỉ
    const provCoord = this.findCoordInString(fullAddress) || (fallbackGeneralAddress ? this.findCoordInString(fallbackGeneralAddress) : null);
    if (provCoord) {
      return { lat: provCoord.lat, lng: provCoord.lng, displayName: provCoord.name || fullAddress, source: 'province_table' };
    }

    return null;
  },

  getProvinceCoord(provinceName) {
    if (!provinceName) return null;
    const clean = this.removeVietnameseTones(provinceName).replace(/^(tinh|thanh pho)\s+/i, '').trim();
    for (const [pName, coord] of Object.entries(PROVINCE_COORDINATES)) {
      const pClean = this.removeVietnameseTones(pName).replace(/^(tinh|thanh pho)\s+/i, '').trim();
      if (pClean === clean || pClean.includes(clean) || clean.includes(pClean)) {
        return { ...coord, name: pName };
      }
    }
    return null;
  },

  findCoordInString(text) {
    if (!text || typeof text !== 'string') return null;
    const cleanText = this.removeVietnameseTones(text);
    for (const [pName, coord] of Object.entries(PROVINCE_COORDINATES)) {
      const pClean = this.removeVietnameseTones(pName).replace(/^(tinh|thanh pho)\s+/i, '').trim();
      if (cleanText.includes(pClean)) {
        return { ...coord, name: pName };
      }
    }
    return null;
  },

  async reverseGeocode(lat, lng) {
    if (!lat || !lng) return null;

    // 1. Goong Reverse Geocoding
    const key = await this.getGoongApiKey();
    if (key) {
      try {
        const url  = `${GOONG_API_BASE}/Geocode?latlng=${lat},${lng}&api_key=${encodeURIComponent(key)}`;
        const res  = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data?.results?.[0]) {
            const item = data.results[0];
            return { formatted_address: item.formatted_address, compound: item.compound, source: 'goong' };
          }
        }
      } catch (e) {}
    }

    // 2. Nominatim reverse
    try {
      const url  = `${NOMINATIM_API_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`;
      const res  = await fetch(url, { headers: NOMINATIM_HEADERS });
      if (res.ok) {
        const data = await res.json();
        if (data?.address) {
          return {
            formatted_address: data.display_name,
            compound: {
              province: data.address.state || data.address.county || '',
              district: data.address.city_district || data.address.suburb || '',
              commune:  data.address.quarter || data.address.neighbourhood || ''
            },
            source: 'nominatim'
          };
        }
      }
    } catch (e) {}

    // 3. Photon reverse
    try {
      const url  = `${PHOTON_API_BASE}/reverse?lat=${lat}&lon=${lng}`;
      const res  = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.features?.length > 0) return { ...data.features[0].properties, source: 'photon' };
    } catch (err) {}
    return null;
  },

  // ─────────────────────────────────────────────────────────────
  //  DISTANCE — Goong → OSRM → Haversine
  // ─────────────────────────────────────────────────────────────

  async calculateDistance(fromCoord, toCoord) {
    if (!fromCoord?.lat || !fromCoord?.lng || !toCoord?.lat || !toCoord?.lng) return null;

    // 1. Goong Distance Matrix (xe máy)
    try {
      const goong = await this.goongDistanceMatrix(fromCoord, toCoord, 'bike');
      if (goong?.distanceKm !== undefined) return goong;
    } catch (e) {}

    // 2. OSRM Routing
    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 5000);
      const url        = `${OSRM_API_BASE}/${fromCoord.lng},${fromCoord.lat};${toCoord.lng},${toCoord.lat}?overview=false`;
      const res        = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.routes?.length > 0 && data.routes[0].distance !== undefined) {
          const km = Math.round((data.routes[0].distance / 1000) * 10) / 10;
          return { distanceKm: km, distanceText: `${km} km`, isGoong: false };
        }
      }
    } catch (err) {}

    // 3. Haversine × 1.25
    try {
      const R    = 6371;
      const dLat = ((toCoord.lat - fromCoord.lat) * Math.PI) / 180;
      const dLon = ((toCoord.lng - fromCoord.lng) * Math.PI) / 180;
      const a    =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((fromCoord.lat * Math.PI) / 180) *
        Math.cos((toCoord.lat  * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
      const km = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.25 * 10) / 10;
      return { distanceKm: km, distanceText: `${km} km`, isGoong: false };
    } catch (e) {
      return null;
    }
  },

  // ─────────────────────────────────────────────────────────────
  //  PHÍ HỎA TỐC
  // ─────────────────────────────────────────────────────────────

  calculateExpressFee(distanceData, rules = {}) {
    const maxDistance = rules.maxDistance !== undefined ? Number(rules.maxDistance) : 20;
    const baseFee     = rules.baseFee     !== undefined ? Number(rules.baseFee)     : 15000;
    const perKmFee    = rules.perKmFee    !== undefined ? Number(rules.perKmFee)    : 5000;

    const distanceKm  = typeof distanceData === 'object' && distanceData !== null
      ? distanceData.distanceKm
      : (typeof distanceData === 'number' ? distanceData : null);

    const isGoong = Boolean(typeof distanceData === 'object' && distanceData?.isGoong);

    if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
      return { eligible: false, fee: baseFee, distanceKm: null, message: 'Đang định vị khoảng cách từ shop đến địa chỉ của bạn...' };
    }

    if (distanceKm > maxDistance) {
      return { eligible: false, fee: 0, distanceKm, maxDistance, isGoong, message: `Khoảng cách ~${distanceKm} km (vượt quá bán kính hỏa tốc tối đa ${maxDistance} km). Vui lòng chọn Giao Tiêu Chuẩn.` };
    }

    if (distanceKm <= 2) {
      return { eligible: true, fee: baseFee, distanceKm, extraKm: 0, isGoong, formula: `${baseFee.toLocaleString('vi-VN')}đ (trong phạm vi 2km đầu)`, message: `Khoảng cách ~${distanceKm} km • Cước cơ bản 2km đầu` };
    }

    const extraKm = Math.ceil(distanceKm - 2);
    const fee     = baseFee + extraKm * perKmFee;

    return {
      eligible: true,
      fee,
      distanceKm,
      extraKm,
      isGoong,
      formula:  `${baseFee.toLocaleString('vi-VN')}đ (2km đầu) + ${extraKm}km × ${perKmFee.toLocaleString('vi-VN')}đ`,
      message:  `Khoảng cách ~${distanceKm} km • +${(extraKm * perKmFee).toLocaleString('vi-VN')}đ cho ${extraKm}km tiếp theo`
    };
  },

  // ─────────────────────────────────────────────────────────────
  //  DỮ LIỆU HÀNH CHÍNH VIỆT NAM (provinces.open-api.vn)
  // ─────────────────────────────────────────────────────────────

  async getProvinces(useV2 = true) {
    const cacheKey = useV2 ? 'candlet_vn_provinces_v2' : 'candlet_vn_provinces_v1';
    try { const cached = sessionStorage.getItem(cacheKey); if (cached) return JSON.parse(cached); } catch (e) {}
    try {
      const res  = await fetch(`${useV2 ? PROVINCES_V2_API_BASE : PROVINCES_API_BASE}/p/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch (e) {}
      return data;
    } catch (error) {
      if (useV2) return this.getProvinces(false);
      return [];
    }
  },

  async getWardsV2(provinceCode) {
    if (!provinceCode) return [];
    const cacheKey = `candlet_vn_wards_v2_${provinceCode}`;
    try { const cached = sessionStorage.getItem(cacheKey); if (cached) return JSON.parse(cached); } catch (e) {}
    try {
      const res  = await fetch(`${PROVINCES_V2_API_BASE}/p/${provinceCode}?depth=2`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const wards = data.wards || [];
      try { sessionStorage.setItem(cacheKey, JSON.stringify(wards)); } catch (e) {}
      return wards;
    } catch (error) { return []; }
  },

  async getDistricts(provinceCode) {
    if (!provinceCode) return [];
    const cacheKey = `candlet_vn_districts_${provinceCode}`;
    try { const cached = sessionStorage.getItem(cacheKey); if (cached) return JSON.parse(cached); } catch (e) {}
    try {
      const res  = await fetch(`${PROVINCES_API_BASE}/p/${provinceCode}?depth=2`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const districts = data.districts || [];
      try { sessionStorage.setItem(cacheKey, JSON.stringify(districts)); } catch (e) {}
      return districts;
    } catch (error) { return []; }
  },

  async getWards(districtCode) {
    if (!districtCode) return [];
    const cacheKey = `candlet_vn_wards_${districtCode}`;
    try { const cached = sessionStorage.getItem(cacheKey); if (cached) return JSON.parse(cached); } catch (e) {}
    try {
      const res  = await fetch(`${PROVINCES_API_BASE}/d/${districtCode}?depth=2`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const wards = data.wards || [];
      try { sessionStorage.setItem(cacheKey, JSON.stringify(wards)); } catch (e) {}
      return wards;
    } catch (error) { return []; }
  },

  // ─────────────────────────────────────────────────────────────
  //  UTILITY
  // ─────────────────────────────────────────────────────────────

  removeVietnameseTones(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .trim();
  }
};
