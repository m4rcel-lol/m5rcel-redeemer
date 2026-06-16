import { randomInt } from "node:crypto";

const CODE_PREFIX = "M5R";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_SEGMENT_LENGTH = 4;
const CODE_SEGMENT_COUNT = 3;

export function generateRedeemCode(): string {
  const segments = Array.from({ length: CODE_SEGMENT_COUNT }, () =>
    generateSegment(CODE_SEGMENT_LENGTH)
  );

  return `${CODE_PREFIX}-${segments.join("-")}`;
}

function generateSegment(length: number): string {
  let segment = "";

  for (let index = 0; index < length; index += 1) {
    segment += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }

  return segment;
}
