import React from 'react'
import { render } from '@testing-library/react'
import { ThemeProvider } from '../contexts/ThemeContext'

// Custom render function that includes providers
const customRender = (ui, options = {}) => {
  const AllTheProviders = ({ children }) => {
    return (
      <ThemeProvider>
        {children}
      </ThemeProvider>
    )
  }

  return render(ui, { wrapper: AllTheProviders, ...options })
}

// Mock data factories - ensure all required fields are present
export const createMockProfile = (overrides = {}) => ({
  id: 1,
  name: 'Test Profile',
  profilePicture: '/profiles/test-image.jpg',
  isActive: true,
  createdDate: new Date().toISOString(),
  ...overrides,
})

export const createMockManga = (overrides = {}) => ({
  id: 1,
  name: 'Test Manga',
  volumes: 10,
  ...overrides,
})

export const createMockEntry = (overrides = {}) => {
  // Create manga first, then allow override
  const baseManga = createMockManga()
  const finalManga = overrides.manga ? { ...baseManga, ...overrides.manga } : baseManga
  
  return {
    id: 1,
    manga: finalManga, // Ensure manga is always present and properly formed
    mangaId: finalManga.id,
    profileId: 1,
    quantity: 5,
    pending: null,
    priority: false,
    ...overrides,
    // Don't override manga again to avoid duplicate key warning
  }
}

// Enhanced mock API responses
export const mockSuccessfulFetch = (data) => {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  })
}

export const mockFailedFetch = (error = 'API Error') => {
  global.fetch.mockRejectedValueOnce(new Error(error))
}

export const mockFetchWithStatus = (status, data = {}) => {
  global.fetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  })
}

// Helper to mock multiple sequential fetch calls
export const mockSequentialFetch = (...responses) => {
  responses.forEach(response => {
    if (response.error) {
      global.fetch.mockRejectedValueOnce(new Error(response.error))
    } else {
      global.fetch.mockResolvedValueOnce({
        ok: response.ok !== undefined ? response.ok : true,
        status: response.status || 200,
        json: async () => response.data || {},
      })
    }
  })
}

// re-export everything
export * from '@testing-library/react'

// override render method
export { customRender as render }