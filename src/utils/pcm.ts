/**
 * Pure 16-bit PCM little-endian audio conversion & Korean segment extraction utilities
 * for real-time voice audio processing (16kHz input, 24kHz output).
 */

/**
 * Resamples arbitrary microphone Float32 PCM (e.g. 44.1kHz or 48kHz hardware AudioContext)
 * to 16kHz mono PCM (`audio/pcm;rate=16000`).
 */
export function downsampleTo16kHz(
  input: Float32Array,
  sourceSampleRate: number
): Float32Array {
  const targetRate = 16000;
  if (!sourceSampleRate || sourceSampleRate <= 0 || sourceSampleRate === targetRate) {
    return input;
  }
  const ratio = sourceSampleRate / targetRate;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const result = new Float32Array(outputLength);

  if (ratio > 1) {
    // Box-filter averaging for clean anti-aliased downsampling
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < outputLength) {
      const nextOffsetBuffer = Math.min(input.length, Math.round((offsetResult + 1) * ratio));
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer; i++) {
        accum += input[i];
        count += 1;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult += 1;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  // Linear interpolation if hardware rate is lower than 16kHz
  for (let i = 0; i < outputLength; i++) {
    const srcIdx = i * ratio;
    const low = Math.floor(srcIdx);
    const high = Math.min(input.length - 1, low + 1);
    const frac = srcIdx - low;
    result[i] = input[low] * (1 - frac) + input[high] * frac;
  }
  return result;
}

export function float32ToInt16Pcm(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
  }
  return output;
}

export function int16ToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function base64ToFloat32Pcm(base64: string): Float32Array<ArrayBuffer> {
  const binary = atob(base64);
  const byteLen = binary.length - (binary.length % 2);
  const bytes = new Uint8Array(byteLen);
  for (let i = 0; i < byteLen; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const sampleCount = byteLen / 2;
  const buffer = new ArrayBuffer(sampleCount * 4);
  const float32 = new Float32Array(buffer);
  for (let i = 0; i < sampleCount; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

/**
 * Extracts distinct Korean Hangul sentences/phrases from a bilingual Chinese+Korean tutor message
 * so every Korean sentence can render a dedicated follow-along read-aloud button.
 */
export function extractKoreanSegments(text: string): string[] {
  if (!text.trim()) return [];
  // Match contiguous Korean phrases including internal spaces, digits, and punctuation
  const matches = text.match(/[\uAC00-\uD7A3]+(?:[\s,~!?.'"\-0-9]*[\uAC00-\uD7A3]+)*[.?!~]?/g);
  if (!matches) return [];
  const seen = new Set<string>();
  const results: string[] = [];
  for (const raw of matches) {
    const cleaned = raw.trim().replace(/^[,.\s]+/, '');
    // Keep meaningful words/sentences (>= 2 Hangul chars)
    const hangulCount = (cleaned.match(/[\uAC00-\uD7A3]/g) || []).length;
    if (hangulCount >= 2 && !seen.has(cleaned)) {
      seen.add(cleaned);
      results.push(cleaned);
    }
  }
  return results;
}
