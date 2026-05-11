// Generate a deterministic color based on a string (e.g., email)
export function generateUserColor(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  const hue = Math.abs(hash % 360);
  const saturation = 70 + (Math.abs(hash) % 20);
  const lightness = 50 + (Math.abs(hash) % 10);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function getGradientColors(input: string): { color1: string; color2: string } {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 60) % 360;

  const color1 = `hsl(${hue1}, 75%, 55%)`;
  const color2 = `hsl(${hue2}, 75%, 55%)`;

  return { color1, color2 };
}
