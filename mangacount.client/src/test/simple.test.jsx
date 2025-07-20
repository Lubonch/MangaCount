import { describe, it, expect } from 'vitest'
import { render, screen } from './test-utils'
import React from 'react'

// Simple component for testing
const TestComponent = ({ name = 'World' }) => (
    <div>
        <h1>Hello {name}!</h1>
        <p>This is a test component</p>
    </div>
)

describe('Simple Test', () => {
    it('should render test component', () => {
        render(<TestComponent />)

        expect(screen.getByText('Hello World!')).toBeInTheDocument()
        expect(screen.getByText('This is a test component')).toBeInTheDocument()
    })

    it('should render with custom name', () => {
        render(<TestComponent name="React" />)

        expect(screen.getByText('Hello React!')).toBeInTheDocument()
    })
})