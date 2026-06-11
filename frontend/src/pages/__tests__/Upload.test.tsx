import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const { mockUploadFile } = vi.hoisted(() => ({
  mockUploadFile: vi.fn<() => Promise<void>>(),
}))

vi.mock('../../lib/upload', () => ({
  uploadFile: mockUploadFile,
}))

let Upload: any

beforeEach(async () => {
  vi.clearAllMocks()
  Upload = (await import('../Upload')).default
})

function renderUpload() {
  return render(
    <MemoryRouter>
      <Upload />
    </MemoryRouter>
  )
}

describe('Upload', () => {
  it('shows file input and disabled upload button initially', async () => {
    renderUpload()
    expect(screen.getByRole('heading', { name: /upload file/i })).toBeInTheDocument()
    const uploadBtn = screen.getByRole('button', { name: /upload file/i })
    expect(uploadBtn).toBeDisabled()
  })

  it('shows file info after selection', async () => {
    renderUpload()
    const user = userEvent.setup()
    const file = new File(['test content'], 'document.txt', { type: 'text/plain' })
    const input = document.querySelector('input[type="file"]')!

    await user.upload(input, file)

    expect(screen.getByText('document.txt')).toBeInTheDocument()
  })

  it('shows progress bar during upload', async () => {
    let resolveUpload: (value?: unknown) => void = () => {}
    mockUploadFile.mockImplementation(
      async (_file: File, onProgress: (p: any) => void) => {
        onProgress({ current: 1, total: 3 })
        onProgress({ current: 2, total: 3 })
        await new Promise<void>((r) => {
          resolveUpload = r
        })
      },
    )

    renderUpload()
    const user = userEvent.setup()
    const file = new File(['data'], 'report.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]')!

    await user.upload(input, file)
    await user.click(screen.getByRole('button', { name: /upload file/i }))

    expect(await screen.findByText('Mengupload chunk 2 / 3')).toBeInTheDocument()
  })

  it('shows success message after upload', async () => {
    mockUploadFile.mockResolvedValue(undefined)

    renderUpload()
    const user = userEvent.setup()
    const file = new File(['data'], 'report.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]')!

    await user.upload(input, file)
    await user.click(screen.getByRole('button', { name: /upload file/i }))

    expect(await screen.findByText('Upload Berhasil')).toBeInTheDocument()
  })

  it('shows error when upload fails', async () => {
    mockUploadFile.mockRejectedValue(new Error('Gagal terhubung ke server'))

    renderUpload()
    const user = userEvent.setup()
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]')!

    await user.upload(input, file)
    await user.click(screen.getByRole('button', { name: /upload file/i }))

    expect(await screen.findByText('Gagal terhubung ke server')).toBeInTheDocument()
  })
})
