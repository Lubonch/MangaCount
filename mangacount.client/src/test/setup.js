import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// Mock window.location
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

// Mock ThemeToggle component 
vi.mock('../components/ThemeToggle', () => ({
  default: () => null
}))

// Mock AddEntryModal component
vi.mock('../components/AddEntryModal', () => ({
  default: ({ isOpen, onClose }) => isOpen ? 'Add Entry Modal' : null
}))

// Mock AddMangaModal component
vi.mock('../components/AddMangaModal', () => ({
  default: ({ isOpen, onClose }) => isOpen ? 'Add Manga Modal' : null
}))

// Mock AddProfileModal component
vi.mock('../components/AddProfileModal', () => ({
  default: ({ isOpen, onClose }) => isOpen ? 'Add Profile Modal' : null
}))

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})