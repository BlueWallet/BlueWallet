const decodeURL = (url: string): string => {
  try {
    return decodeURIComponent(url);
  } catch (error) {
    console.error('Failed to decode URL, using original', error);
    return url;
  }
};

export default decodeURL;
