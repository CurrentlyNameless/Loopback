/**
 * core/utils/CanvasUtils.ts
 *
 * Shared canvas utilities for all modules that use @napi-rs/canvas.
 *
 * Provides:
 *  - fillTextWithEmojis()    – renders text with inline Twemoji images so emojis
 *                              never appear as broken boxes on Skia/napi-rs canvas
 *  - measureTextWithEmojis() – measures the width of a mixed text+emoji string
 *  - drawRoundedRect()       – convenience rounded rectangle fill+stroke helper
 *  - drawGlowCircle()        – radial gradient glow ring around a point
 *  - drawGradientRect()      – linear gradient fill over a rectangle
 *
 * Usage:
 *   import { fillTextWithEmojis } from '../../../core/utils/CanvasUtils.ts';
 */

import { loadImage } from '@napi-rs/canvas';

// Process-level emoji image cache — shared across ALL canvas renders.
const _emojiImageCache = new Map<string, any>();

// Regex matching custom Discord emojis AND standard Unicode emoji sequences
const EMOJI_REGEX =
  /<a?:([^:]+):(\d+)>|(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\uFE0F)?(?:\u200D(?:\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\uFE0F)?)*/gu;

function _parseFontSize(font: string): number {
  const m = font.match(/(\d+(?:\.\d+)?)px/);
  return m ? parseFloat(m[1]) : 16;
}

function _twemojiUrl(emoji: string): string {
  const codePoints = Array.from(emoji)
    .map((c) => c.codePointAt(0)!.toString(16))
    .filter((c) => c !== 'fe0f');
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codePoints.join('-')}.png`;
}

async function _loadEmojiImage(cacheKey: string, url: string): Promise<any | null> {
  let img = _emojiImageCache.get(cacheKey);
  if (!img) {
    try {
      img = await loadImage(url);
      _emojiImageCache.set(cacheKey, img);
    } catch {
      return null;
    }
  }
  return img;
}

/**
 * Renders a string onto a canvas context with full emoji support.
 * Unicode and custom Discord emojis are drawn as Twemoji / CDN images.
 * Returns the x coordinate immediately after the last drawn character.
 */
export async function fillTextWithEmojis(
  ctx: any,
  text: string,
  x: number,
  y: number,
  spacing = 3,
): Promise<number> {
  if (!text) return x;

  const originalAlign = ctx.textAlign || 'left';
  const totalWidth = measureTextWithEmojis(ctx, text, spacing);
  
  let currentX = x;
  if (originalAlign === 'center') {
    currentX = x - totalWidth / 2;
  } else if (originalAlign === 'right') {
    currentX = x - totalWidth;
  }

  ctx.save();
  ctx.textAlign = 'left';

  const matches = [...text.matchAll(EMOJI_REGEX)];
  if (matches.length === 0) {
    ctx.fillText(text, currentX, y);
    ctx.restore();
    return currentX + totalWidth;
  }

  let lastIndex = 0;

  for (const m of matches) {
    const plainPart = text.slice(lastIndex, m.index!);
    if (plainPart) {
      ctx.fillText(plainPart, currentX, y);
      currentX += ctx.measureText(plainPart).width;
    }

    const size = _parseFontSize(ctx.font);

    if (m[2]) {
      // Custom Discord emoji
      const emojiId = m[2];
      const isAnimated = m[0].startsWith('<a:');
      const url = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}`;
      const img = await _loadEmojiImage(`discord_${emojiId}`, url);
      if (img) {
        ctx.drawImage(img, currentX, y - size * 0.85, size, size);
        currentX += size + spacing;
      } else {
        const fallback = `:${m[1]}:`;
        ctx.fillText(fallback, currentX, y);
        currentX += ctx.measureText(fallback).width;
      }
    } else {
      // Unicode emoji via Twemoji
      const url = _twemojiUrl(m[0]);
      const cacheKey = 'tw_' + url.split('/').pop()!.replace('.png', '');
      const img = await _loadEmojiImage(cacheKey, url);
      if (img) {
        ctx.drawImage(img, currentX, y - size * 0.85, size, size);
        currentX += size + spacing;
      } else {
        ctx.fillText(m[0], currentX, y);
        currentX += ctx.measureText(m[0]).width;
      }
    }

    lastIndex = m.index! + m[0].length;
  }

  const tail = text.slice(lastIndex);
  if (tail) {
    ctx.fillText(tail, currentX, y);
    currentX += ctx.measureText(tail).width;
  }

  ctx.restore();
  return currentX;
}

/**
 * Estimates the total pixel width of a mixed text+emoji string without drawing.
 */
export function measureTextWithEmojis(ctx: any, text: string, spacing = 3): number {
  if (!text) return 0;
  const size = _parseFontSize(ctx.font);
  let width = 0;
  let lastIndex = 0;
  for (const m of text.matchAll(EMOJI_REGEX)) {
    const plainPart = text.slice(lastIndex, m.index!);
    if (plainPart) width += ctx.measureText(plainPart).width;
    width += size + spacing;
    lastIndex = m.index! + m[0].length;
  }
  const tail = text.slice(lastIndex);
  if (tail) width += ctx.measureText(tail).width;
  return width;
}

export interface RoundedRectOptions {
  x: number; y: number; width: number; height: number;
  radius?: number;
  fillStyle?: string;
  strokeStyle?: string;
  lineWidth?: number;
}

/** Draws a filled and/or stroked rounded rectangle. */
export function drawRoundedRect(ctx: any, opts: RoundedRectOptions): void {
  const { x, y, width, height, radius = 12, fillStyle, strokeStyle, lineWidth = 1.5 } = opts;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  if (fillStyle !== undefined) { ctx.fillStyle = fillStyle; ctx.fill(); }
  if (strokeStyle !== undefined) { ctx.strokeStyle = strokeStyle; ctx.lineWidth = lineWidth; ctx.stroke(); }
  ctx.restore();
}

export interface GlowCircleOptions {
  x: number; y: number; innerRadius: number; outerRadius: number; glowColor: string;
}

/** Draws a radial gradient glow ring (e.g. avatar glow). */
export function drawGlowCircle(ctx: any, opts: GlowCircleOptions): void {
  const { x, y, innerRadius, outerRadius, glowColor } = opts;
  const grad = ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
  grad.addColorStop(0, glowColor);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export interface GradientRectOptions {
  x: number; y: number; width: number; height: number;
  stops: Array<{ stop: number; color: string }>;
  direction?: 'horizontal' | 'vertical';
}

/** Fills a rectangle with a linear gradient. */
export function drawGradientRect(ctx: any, opts: GradientRectOptions): void {
  const { x, y, width, height, stops, direction = 'horizontal' } = opts;
  const grad = direction === 'horizontal'
    ? ctx.createLinearGradient(x, y, x + width, y)
    : ctx.createLinearGradient(x, y, x, y + height);
  for (const { stop, color } of stops) grad.addColorStop(stop, color);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

/** Clears the in-memory emoji image cache. */
export function clearEmojiCache(): void {
  _emojiImageCache.clear();
}

// ---------------------------------------------------------------------------
// HIGH-LEVEL CANVAS COMPONENTS
// Reusable building blocks for module card renderers.
// ---------------------------------------------------------------------------

export interface DrawAvatarOptions {
  x: number;
  y: number;
  radius: number;
  url: string;
  glowColor?: string;
  ringColor?: string;
  ringWidth?: number;
}

/**
 * Fetches and draws a circular avatar with optional outer glow and border ring.
 * Falls back to a solid-color circle if the image can't be loaded.
 */
export async function drawAvatar(
  ctx: any,
  opts: DrawAvatarOptions,
  fallbackColor = '#888',
): Promise<void> {
  const { x, y, radius, url, glowColor, ringColor, ringWidth = 4 } = opts;
  if (glowColor) {
    drawGlowCircle(ctx, { x, y, innerRadius: radius - 5, outerRadius: radius + 20, glowColor });
  }
  try {
    const img = await loadImage(url);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  } catch {
    ctx.save();
    ctx.fillStyle = fallbackColor;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (ringColor) {
    ctx.save();
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = ringWidth;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export interface DrawPartyHatOptions {
  x: number;
  y: number;
  coneColor: string;
  stripeColor: string;
  pomColor: string;
  tiltRad?: number;
}

/** Draws a party hat (cone + accent stripe + pom) anchored at (x, y). */
export function drawPartyHat(ctx: any, opts: DrawPartyHatOptions): void {
  const { x, y, coneColor, stripeColor, pomColor, tiltRad = -0.15 } = opts;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tiltRad);
  ctx.fillStyle = coneColor;
  ctx.beginPath();
  ctx.moveTo(0, -38);
  ctx.lineTo(-20, 0);
  ctx.lineTo(20, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = stripeColor;
  ctx.beginPath();
  ctx.moveTo(-10, -18); ctx.lineTo(10, -18);
  ctx.lineTo(14, -10); ctx.lineTo(-14, -10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = pomColor;
  ctx.beginPath();
  ctx.arc(0, -38, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export interface ConfettiDot { x: number; y: number; r: number; colorIndex: number; }
export interface ConfettiRibbon { x: number; y: number; w: number; h: number; rot: number; colorIndex: number; }

/** Draws scattered confetti dots and ribbon shapes using the given color palette. */
export function drawConfetti(
  ctx: any,
  colors: string[],
  dots: ConfettiDot[],
  ribbons: ConfettiRibbon[],
): void {
  for (const d of dots) {
    ctx.fillStyle = colors[d.colorIndex % colors.length];
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const r of ribbons) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.rot);
    ctx.fillStyle = colors[r.colorIndex % colors.length];
    ctx.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
    ctx.restore();
  }
}

export interface DrawBadgePillOptions {
  x: number;
  y: number;
  height?: number;
  radius?: number;
  fillColor?: string;
  strokeColor?: string;
  borderColor?: string;
  lineWidth?: number;
  accentDotColor?: string;
  paddingX?: number;
  paddingY?: number;
  text?: string;
  font?: string;
  textColor?: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Draws a badge pill background (rounded rect + optional accent dot and text).
 * Supports both:
 *   - drawBadgePill(ctx, width, opts)  -> traditional manual width signature
 *   - drawBadgePill(ctx, opts)         -> self-contained badge with automatic text measurement & rendering
 * Returns the x position where text content should start (or did start).
 */
export function drawBadgePill(
  ctx: any,
  widthOrOpts: number | DrawBadgePillOptions,
  maybeOpts?: DrawBadgePillOptions,
): number {
  let width: number;
  let opts: DrawBadgePillOptions;

  if (typeof widthOrOpts === 'object' && widthOrOpts !== null) {
    opts = widthOrOpts;
    if (opts.text) {
      ctx.save();
      if (opts.font) ctx.font = opts.font;
      const textWidth = ctx.measureText(opts.text).width;
      ctx.restore();
      const padX = opts.paddingX ?? 14;
      width = Math.ceil(textWidth + padX * 2);
    } else {
      width = 100;
    }
  } else {
    width = widthOrOpts;
    opts = maybeOpts || ({} as DrawBadgePillOptions);
  }

  const {
    x,
    y,
    height = opts.radius ? opts.radius * 2 : 36,
    radius = 18,
    fillColor = 'rgba(255,255,255,0.12)',
    strokeColor,
    borderColor,
    lineWidth = 1.5,
    accentDotColor,
    paddingX = 28,
    text,
    font,
    textColor = '#FFFFFF',
    align = 'left',
  } = opts;

  const actualStroke = strokeColor || borderColor;

  let drawX = x;
  if (align === 'right') {
    drawX = x - width;
  } else if (align === 'center') {
    drawX = x - width / 2;
  }

  const drawY = opts.paddingY !== undefined ? y - height / 2 : y;

  drawRoundedRect(ctx, {
    x: drawX,
    y: drawY,
    width,
    height,
    radius,
    fillStyle: fillColor,
    strokeStyle: actualStroke,
    lineWidth,
  });

  if (accentDotColor) {
    ctx.save();
    ctx.fillStyle = accentDotColor;
    ctx.beginPath();
    ctx.arc(drawX + 14, drawY + height / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (text) {
    ctx.save();
    if (font) ctx.font = font;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, drawX + width / 2, drawY + height / 2);
    ctx.restore();
  }

  return drawX + paddingX;
}

export interface DrawStatBarOptions {
  x: number; y: number; width: number; height?: number;
  value: number;
  bgColor?: string;
  fillColor: string;
  radius?: number;
}

/** Draws a horizontal stat/XP/progress bar filled to `value` (0–1). */
export function drawStatBar(ctx: any, opts: DrawStatBarOptions): void {
  const { x, y, width, height = 10, value, bgColor = 'rgba(255,255,255,0.1)', fillColor, radius = 5 } = opts;
  drawRoundedRect(ctx, { x, y, width, height, radius, fillStyle: bgColor });
  if (value > 0) {
    const fillW = Math.max(radius * 2, width * Math.min(1, value));
    drawRoundedRect(ctx, { x, y, width: fillW, height, radius, fillStyle: fillColor });
  }
}

export interface DrawCardFrameOptions {
  width: number; height: number;
  bgStops: Array<{ stop: number; color: string }>;
  borderColor?: string;
  borderRadius?: number;
  borderPadding?: number;
}

/** Draws the card outer frame: gradient background + optional glowing border inset. */
export function drawCardFrame(ctx: any, opts: DrawCardFrameOptions): void {
  const { width, height, bgStops, borderColor, borderRadius = 16, borderPadding = 20 } = opts;
  drawGradientRect(ctx, { x: 0, y: 0, width, height, stops: bgStops, direction: 'horizontal' });
  if (borderColor) {
    ctx.save();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(borderPadding, borderPadding, width - borderPadding * 2, height - borderPadding * 2, borderRadius);
    ctx.stroke();
    ctx.restore();
  }
}
