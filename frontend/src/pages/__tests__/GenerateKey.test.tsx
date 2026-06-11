import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const { mockGetConfig, mockSaveConfig, mockGenerateKey } = vi.hoisted(() => ({
  mockGetConfig: vi.fn<() => Promise<null | object>>(),
  mockSaveConfig: vi.fn<() => Promise<void>>(),
  mockGenerateKey: vi.fn<() => Promise<object>>(),
}))

vi.mock('../../lib/db/config', () => ({
  getConfig: mockGetConfig,
  saveConfig: mockSaveConfig,
}))

vi.mock('../../lib/crypto', () => ({
  generateKeyFromPassword: mockGenerateKey,
}))

let GenerateKey: any

beforeEach(async () => {
  vi.clearAllMocks()
  GenerateKey = (await import('../GenerateKey')).default
})

function renderGenerateKey() {
  return render(
    <MemoryRouter>
      <GenerateKey />
    </MemoryRouter>
  )
}

describe('GenerateKey', () => {
  it('shows loading state while initializing', () => {
    mockGetConfig.mockReturnValue(new Promise(() => {}))
    renderGenerateKey()
    expect(screen.getByText('Memuat key dari LocalDB.')).toBeInTheDocument()
  })

  it('shows form when no config exists', async () => {
    mockGetConfig.mockResolvedValue(null)
    renderGenerateKey()

    expect(await screen.findByRole('heading', { name: /generate key/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Masukkan password')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ulangi password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate key/i })).toBeInTheDocument()
  })

  it('shows validation error when password fields are empty', async () => {
    mockGetConfig.mockResolvedValue(null)
    renderGenerateKey()
    const user = userEvent.setup()

    await screen.findByRole('heading', { name: /generate key/i })
    await user.click(screen.getByRole('button', { name: /generate key/i }))

    expect(screen.getByText('Password dan konfirmasi password wajib diisi.')).toBeInTheDocument()
  })

  it('shows validation error when password is too short', async () => {
    mockGetConfig.mockResolvedValue(null)
    renderGenerateKey()
    const user = userEvent.setup()

    await screen.findByRole('heading', { name: /generate key/i })
    await user.type(screen.getByPlaceholderText('Masukkan password'), 'abc')
    await user.type(screen.getByPlaceholderText('Ulangi password'), 'abc')
    await user.click(screen.getByRole('button', { name: /generate key/i }))

    expect(screen.getByText('Password minimal 8 karakter.')).toBeInTheDocument()
  })

  it('shows validation error when passwords do not match', async () => {
    mockGetConfig.mockResolvedValue(null)
    renderGenerateKey()
    const user = userEvent.setup()

    await screen.findByRole('heading', { name: /generate key/i })
    await user.type(screen.getByPlaceholderText('Masukkan password'), 'abcdefgh')
    await user.type(screen.getByPlaceholderText('Ulangi password'), 'different')
    await user.click(screen.getByRole('button', { name: /generate key/i }))

    expect(screen.getByText('Password dan konfirmasi password tidak sama.')).toBeInTheDocument()
  })

  it('shows loading state on button during key generation', async () => {
    mockGetConfig.mockResolvedValue(null)
    mockGenerateKey.mockReturnValue(new Promise(() => {}))
    renderGenerateKey()
    const user = userEvent.setup()

    await screen.findByRole('heading', { name: /generate key/i })
    await user.type(screen.getByPlaceholderText('Masukkan password'), 'password123')
    await user.type(screen.getByPlaceholderText('Ulangi password'), 'password123')
    await user.click(screen.getByRole('button', { name: /generate key/i }))

    expect(await screen.findByText('Membuat Key...')).toBeInTheDocument()
  })

  it('shows success screen after key generation', async () => {
    mockGetConfig.mockResolvedValue(null)
    mockGenerateKey.mockResolvedValue({
      rsa_public_key: 'pub',
      rsa_private_key: 'priv',
      encrypted_aes_key: 'aes',
      encrypted_rc4_key: 'rc4',
    })
    mockSaveConfig.mockResolvedValue(undefined)
    renderGenerateKey()
    const user = userEvent.setup()

    await screen.findByRole('heading', { name: /generate key/i })
    await user.type(screen.getByPlaceholderText('Masukkan password'), 'password123')
    await user.type(screen.getByPlaceholderText('Ulangi password'), 'password123')
    await user.click(screen.getByRole('button', { name: /generate key/i }))

    expect(await screen.findByText('Key Berhasil Dibuat')).toBeInTheDocument()
    expect(screen.getByText('AES + RC4')).toBeInTheDocument()
    expect(screen.getByText('RSA')).toBeInTheDocument()
    expect(screen.getByText('SHA-256')).toBeInTheDocument()
  })

  it('returns to form when "Generate Key Baru" is clicked', async () => {
    mockGetConfig.mockResolvedValue(null)
    mockGenerateKey.mockResolvedValue({
      rsa_public_key: 'pub',
      rsa_private_key: 'priv',
      encrypted_aes_key: 'aes',
      encrypted_rc4_key: 'rc4',
    })
    mockSaveConfig.mockResolvedValue(undefined)
    renderGenerateKey()
    const user = userEvent.setup()

    await screen.findByRole('heading', { name: /generate key/i })
    await user.type(screen.getByPlaceholderText('Masukkan password'), 'password123')
    await user.type(screen.getByPlaceholderText('Ulangi password'), 'password123')
    await user.click(screen.getByRole('button', { name: /generate key/i }))
    await screen.findByText('Key Berhasil Dibuat')

    await user.click(screen.getByRole('button', { name: /generate key baru/i }))

    expect(screen.getByPlaceholderText('Masukkan password')).toBeInTheDocument()
  })

  it('toggles hash algorithm', async () => {
    mockGetConfig.mockResolvedValue({
      rsa_public_key: 'pub',
      rsa_private_key: 'priv',
      encrypted_aes_key: 'aes',
      encrypted_rc4_key: 'rc4',
    })
    renderGenerateKey()
    const user = userEvent.setup()

    await screen.findByText('Key Berhasil Dibuat')
    const toggleButton = screen.getByRole('button', { name: /ganti hash algorithm/i })

    expect(screen.getByText('SHA-256')).toBeInTheDocument()
    await user.click(toggleButton)
    expect(screen.getByText('MD5')).toBeInTheDocument()
    await user.click(toggleButton)
    expect(screen.getByText('SHA-256')).toBeInTheDocument()
  })
})
