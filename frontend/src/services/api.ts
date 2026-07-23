export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mohamed-ai-3-antigra-production.up.railway.app/api';

export const getAuthHeaders = (): Record<string, string> => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
  return {};
};

export const loginUser = async (username: string, password: string) => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);
  
  const res = await fetch(`${API_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  });
  return res.json();
};

export const registerUser = async (username: string, email: string, password: string) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  return res.json();
};

export const fetchMe = async () => {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: getAuthHeaders(),
  });
  return res.json();
};

export const fetchDashboard = async (symbol: string) => {
  const res = await fetch(`${API_URL}/dashboard/${symbol}`);
  return res.json();
};

export const fetchChart = async (symbol: string) => {
  const res = await fetch(`${API_URL}/chart/${symbol}`);
  return res.json();
};

export const fetchIndicators = async (symbol: string) => {
  const res = await fetch(`${API_URL}/indicators/${symbol}`);
  return res.json();
};

export const fetchNews = async (symbol: string) => {
  const res = await fetch(`${API_URL}/news/${symbol}`);
  return res.json();
};

export const fetchSentiment = async (symbol: string) => {
  const res = await fetch(`${API_URL}/sentiment/${symbol}`);
  return res.json();
};

export const fetchMacro = async () => {
  const res = await fetch(`${API_URL}/macro/`);
  return res.json();
};

export const fetchMacroCommentary = async () => {
  const res = await fetch(`${API_URL}/macro/commentary`);
  return res.json();
};

export const fetchMTF = async (symbol: string) => {
  // MTF is now embedded in the indicators response, but we provide a dedicated helper
  const res = await fetch(`${API_URL}/indicators/${symbol}`);
  const data = await res.json();
  return data?.indicators?.MTF || null;
};

export const fetchOptions = async (symbol: string) => {
  const res = await fetch(`${API_URL}/options/${symbol}`);
  return res.json();
};

export const fetchAnalyze = async (symbol: string, indicators: any, capital?: number) => {
  const bodyData: any = { symbol, indicators };
  if (capital !== undefined) {
    bodyData.capital = capital;
  }
  
  const res = await fetch(`${API_URL}/analyze/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bodyData),
  });
  return res.json();
};

export const fetchChat = async (symbol: string, message: string, context: any) => {
  const res = await fetch(`${API_URL}/chat/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ symbol, message, context }),
  });
  return res.json();
};

export const fetchActiveTrades = async () => {
  const res = await fetch(`${API_URL}/trades/active`, { headers: getAuthHeaders() });
  return res.json();
};

export const fetchTradeHistory = async () => {
  const res = await fetch(`${API_URL}/trades/history`, { headers: getAuthHeaders() });
  return res.json();
};

export const executeTrade = async (symbol: string, type: string, volume: number, entry_price: number) => {
  const res = await fetch(`${API_URL}/trades/execute`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, type, volume, entry_price }),
  });
  return res.json();
};

export const closeTrade = async (trade_id: number, exit_price: number) => {
  const res = await fetch(`${API_URL}/trades/close/${trade_id}?exit_price=${exit_price}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return res.json();
};
