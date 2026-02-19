// Always use relative API paths for Netlify proxy to backend
// DO NOT use any base URL or hardcoded http://... here!
const API_BASE_URL = '';

const getToken = () => localStorage.getItem('auth_token');

const buildHeaders = (hasBody: boolean) => {
  const headers: Record<string, string> = {};
  if (hasBody) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const hasBody = Boolean(options.body);
  const fullUrl = `${API_BASE_URL}${path}`;
  
  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        ...buildHeaders(hasBody),
        ...(options.headers || {})
      }
    });

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const data = await res.json();
        message = data?.message || message;
      } catch {
        // ignore
      }
      console.error(`❌ API Error [${res.status}]:`, message, 'URL:', fullUrl);
      throw new Error(message);
    }

    if (res.status === 204) {
      return {} as T;
    }

    const data = await res.json() as Promise<T>;
    console.log(`✅ API Success [${res.status}]:`, path);
    return data;
  } catch (error) {
    console.error(`❌ API Request Error:`, error, 'URL:', fullUrl);
    throw error;
  }
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};
