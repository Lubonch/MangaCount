import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Tests pin the language to Spanish (the existing asserts are in ES).
globalThis.__MANGACOUNT_LANG__ = 'es'

global.fetch = vi.fn()

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:5173',
    href: 'http://localhost:5173',
  },
  writable: true,
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}

// Mock CollectionView component to prevent undefined manga errors
vi.mock('../components/CollectionView', () => ({
  default: () => 'Collection View Component'
}))

vi.mock('../components/ThemeToggle', () => ({
  default: () => null
}))

vi.mock('../components/AddEntryModal', () => ({
  default: ({ isOpen, onClose }) => isOpen ? 'Add Entry Modal' : null
}))

vi.mock('../components/AddMangaModal', () => ({
  default: ({ isOpen, onClose }) => isOpen ? 'Add Manga Modal' : null
}))

vi.mock('../components/AddProfileModal', () => ({
  default: ({ isOpen, onClose }) => isOpen ? 'Add Profile Modal' : null
}))

beforeEach(() => {
  vi.clearAllMocks()
})