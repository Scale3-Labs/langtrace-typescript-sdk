export function estimateTokensInChunk(chunk: string): number {
  if (chunk && chunk.length > 0) {
    // Simplified token estimation: count the words.
    return chunk.split(/\s+/).filter(Boolean).length;
  }
  return 0;
}
