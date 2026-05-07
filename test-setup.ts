import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn((key: string) => {
    return localStorageMock[key] || null;
  }),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageMock).forEach(key => {
      if (typeof localStorageMock[key] === 'string') {
        delete localStorageMock[key];
      }
    });
  }),
};

global.localStorage = localStorageMock as any;
