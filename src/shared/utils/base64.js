export function safeBtoaUnicode(str) {
  if (typeof window === 'undefined' || typeof btoa === 'undefined') {
    return Buffer.from(str, 'utf8').toString('base64');
  }

  try {
    return btoa(str);
  } catch (err) {
    const utf8 = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < utf8.length; i++) {
      binary += String.fromCharCode(utf8[i]);
    }
    return btoa(binary);
  }
}
