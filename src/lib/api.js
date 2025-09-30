import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://wmhsl-real-estate-backend.vercel.app';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});
