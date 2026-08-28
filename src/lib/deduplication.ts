import CryptoJS from 'crypto-js';

/**
 * Generates SHA-256 unique hash for transaction deduplication.
 * Hash string format: transaction_date + '_' + (transaction_time || '') + '_' + payment_method + '_' + amount + '_' + description
 */
export function generateTransactionHash(
  date: string,
  time: string | undefined,
  paymentMethod: string,
  amount: number,
  description: string
): string {
  const normalizedDate = (date || '').trim();
  const normalizedTime = (time || '').trim();
  const normalizedPayment = (paymentMethod || '').trim();
  const normalizedAmount = Math.abs(Number(amount) || 0);
  const normalizedDesc = (description || '').trim();

  const rawKey = `${normalizedDate}_${normalizedTime}_${normalizedPayment}_${normalizedAmount}_${normalizedDesc}`;
  return CryptoJS.SHA256(rawKey).toString(CryptoJS.enc.Hex);
}

/**
 * Checks if a candidate transaction unique_hash already exists in existing transactions array.
 */
export function isDuplicateTransaction(
  hash: string,
  existingHashes: Set<string>
): boolean {
  return existingHashes.has(hash);
}
