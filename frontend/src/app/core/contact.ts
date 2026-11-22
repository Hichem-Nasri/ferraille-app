export function whatsappLink(number: string, message: string): string {
  let digits = number.replace(/[^0-9]/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.length === 8) {
    digits = `216${digits}`;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function phoneLink(number: string): string {
  let clean = number.replace(/[^0-9+]/g, '');
  if (/^[0-9]{8}$/.test(clean)) {
    clean = `+216${clean}`;
  }
  return `tel:${clean}`;
}
