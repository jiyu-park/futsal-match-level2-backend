import { BadRequestException } from '@nestjs/common';

export type FieldErrors = Record<string, string>;

// 칸마다 쉬운 말로 된 오류를 모아서 한 번에 돌려준다
export function throwIfErrors(errors: FieldErrors) {
  if (Object.keys(errors).length > 0) {
    throw new BadRequestException({
      message: '입력한 내용을 다시 확인해 주세요.',
      errors,
    });
  }
}

export function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function todayInSeoul(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// 빈 값이나 글자가 섞인 값은 숫자로 인정하지 않는다
export function toWholeNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}
