import axios from 'axios';

const API = (process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api'));

export async function getPublicCollection(slug) {
  const { data } = await axios.get(`${API}/public/collections/${slug}`);
  return data;
}

export async function getPublicProfile(username) {
  const { data } = await axios.get(`${API}/public/profile/${username}`);
  return data;
}
