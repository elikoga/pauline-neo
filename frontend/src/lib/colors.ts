// input: h in [0,360] and s,v in [0,1] - output: r,g,b in [0,1]
const hsv2rgb = (h: number, s: number, v: number) => {
  const f = (n: number, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  return [f(5), f(3), f(1)] as const;
};

const rgb2hex = (r: number, g: number, b: number) => {
  r = Math.round(r * 255);
  g = Math.round(g * 255);
  b = Math.round(b * 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export const colorCount = 12;
// after colorCount / 2, we will offset everything by (360 / colorCount)
// the general offset is (360 / colorCount) * 2
export const colors = (() => {
  const offsetHalf = 360 / colorCount;
  const generalOffset = (360 / colorCount) * 2;
  const colorList = [...Array(colorCount).keys()]
    .map((i) => {
      if (i < colorCount / 2) {
        return i * generalOffset;
      } else {
        return (i - colorCount / 2) * generalOffset + offsetHalf;
      }
    })
    .map((h) => [
      // first dark then light
      rgb2hex(...hsv2rgb(h, 0.9, 0.3)),
      rgb2hex(...hsv2rgb(h, 0.6, 0.4))
    ]);
  return colorList;
})();
