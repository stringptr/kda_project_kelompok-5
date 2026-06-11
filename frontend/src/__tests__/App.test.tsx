import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const { mockGetConfig } = vi.hoisted(() => ({
  mockGetConfig: vi.fn(),
}))

vi.mock('../lib/db/config', () => ({
  getConfig: mockGetConfig,
}))

vi.mock('../pages/GenerateKey', () => ({
  default: () => <div>generate-key-page</div>,
}))

vi.mock('../pages/Upload', () => ({
  default: () => <div>upload-page</div>,
}))

vi.mock('../pages/Download', () => ({
  default: () => <div>download-page</div>,
}))

import App from '../App'

describe('App', () => {
  it('renders GenerateKey at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('generate-key-page')).toBeInTheDocument()
  })

  it('redirects from /upload to / when no config', async () => {
    mockGetConfig.mockResolvedValue(null)

    render(
      <MemoryRouter initialEntries={['/upload']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText('generate-key-page')).toBeInTheDocument()
  })

  it('renders Upload at /upload when config exists', async () => {
    mockGetConfig.mockResolvedValue({
      rsa_public_key: 'k',
      rsa_private_key: 'k',
      encrypted_aes_key: 'aes',
      encrypted_rc4_key: 'rc4',
    })

    render(
      <MemoryRouter initialEntries={['/upload']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText('upload-page')).toBeInTheDocument()
  })

  it('redirects from /download to / when no config', async () => {
    mockGetConfig.mockResolvedValue(null)

    render(
      <MemoryRouter initialEntries={['/download']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText('generate-key-page')).toBeInTheDocument()
  })

  it('renders Download at /download when config exists', async () => {
    mockGetConfig.mockResolvedValue({
      rsa_public_key: 'k',
      rsa_private_key: 'k',
      encrypted_aes_key: 'aes',
      encrypted_rc4_key: 'rc4',
    })

    render(
      <MemoryRouter initialEntries={['/download']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText('download-page')).toBeInTheDocument()
  })
})
