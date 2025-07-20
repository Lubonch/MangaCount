import React from 'react'

export const MockThemeToggle = () => (
  <button className="theme-toggle" title="Switch to light mode" data-testid="theme-toggle">
    <span className="theme-icon">☀️</span>
    <span className="theme-text">Light</span>
  </button>
)

export const MockAddEntryModal = ({ isOpen, onClose }) => 
  isOpen ? <div data-testid="add-entry-modal">Add Entry Modal</div> : null

export const MockAddMangaModal = ({ isOpen, onClose }) => 
  isOpen ? <div data-testid="add-manga-modal">Add Manga Modal</div> : null

export const MockAddProfileModal = ({ isOpen, onClose }) => 
  isOpen ? <div data-testid="add-profile-modal">Add Profile Modal</div> : null

export const MockLoadBearingCheck = ({ children }) => children