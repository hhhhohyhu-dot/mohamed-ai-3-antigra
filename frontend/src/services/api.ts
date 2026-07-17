const API_URL = 'http://localhost:8000/api';

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

export const fetchAnalyze = async (symbol: string, indicators: any) => {
  const res = await fetch(`${API_URL}/analyze/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ symbol, indicators }),
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
