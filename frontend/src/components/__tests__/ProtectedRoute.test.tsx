import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const { mockGetConfig } = vi.hoisted(() => ({
  mockGetConfig: vi.fn<() => Promise<null | object>>(),
}))

vi.mock('../../lib/db/config', () => ({
  getConfig: mockGetConfig,
}))

function renderWithRouter(initialEntry = '/upload') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<div>home-page</div>} />
        <Route
          path="/upload"
          element={
            <div>protected-content</div>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('returns null while checking', async () => {
    mockGetConfig.mockReturnValue(new Promise<null>(() => {}))

    const { default: ProtectedRoute } = await import('../ProtectedRoute')

    render(
      <MemoryRouter initialEntries={['/upload']}>
        <Routes>
          <Route path="/" element={<div>home-page</div>} />
          <Route
            path="/upload"
            element={<ProtectedRoute><div>protected-content</div></ProtectedRoute>}
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByText('protected-content')).not.toBeInTheDocument()
    expect(screen.queryByText('home-page')).not.toBeInTheDocument()
  })

  it('redirects to / when no config exists', async () => {
    mockGetConfig.mockResolvedValue(null)

    const { default: ProtectedRoute } = await import('../ProtectedRoute')

    render(
      <MemoryRouter initialEntries={['/upload']}>
        <Routes>
          <Route path="/" element={<div>home-page</div>} />
          <Route
            path="/upload"
            element={<ProtectedRoute><div>protected-content</div></ProtectedRoute>}
          />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('home-page')).toBeInTheDocument()
    expect(screen.queryByText('protected-content')).not.toBeInTheDocument()
  })

  it('renders children when config exists', async () => {
    mockGetConfig.mockResolvedValue({
      rsa_public_key: 'key',
      rsa_private_key: 'key',
      encrypted_aes_key: 'aes',
      encrypted_rc4_key: 'rc4',
    })

    const { default: ProtectedRoute } = await import('../ProtectedRoute')

    render(
      <MemoryRouter initialEntries={['/upload']}>
        <Routes>
          <Route path="/" element={<div>home-page</div>} />
          <Route
            path="/upload"
            element={<ProtectedRoute><div>protected-content</div></ProtectedRoute>}
          />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('protected-content')).toBeInTheDocument()
    expect(screen.queryByText('home-page')).not.toBeInTheDocument()
  })
})
