import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const { mockGetAllFiles, mockGetChunksByFileId, mockSaveBlob, mockDecryptChunks, mockMergeChunks, mockHashFile, mockVerifyHash } = vi.hoisted(() => ({
  mockGetAllFiles: vi.fn<() => Promise<any[]>>(),
  mockGetChunksByFileId: vi.fn<() => Promise<any[]>>(),
  mockSaveBlob: vi.fn(),
  mockDecryptChunks: vi.fn<() => Promise<any[]>>(),
  mockMergeChunks: vi.fn<() => Promise<Uint8Array>>(),
  mockHashFile: vi.fn<() => Promise<string>>(),
  mockVerifyHash: vi.fn<() => Promise<void>>(),
}))

vi.mock('../../lib/db/files', () => ({
  getAllFiles: mockGetAllFiles,
  getChunksByFileId: mockGetChunksByFileId,
}))

vi.mock('../../lib/Download', () => ({
  saveBlobAsFile: mockSaveBlob,
  decryptChunks: mockDecryptChunks,
  mergeChunks: mockMergeChunks,
  hashFile: mockHashFile,
  verifyHash: mockVerifyHash,
}))

const mockFile = {
  id: 1,
  original_name: 'laporan.pdf',
  size: 1024 * 500,
  total_chunks: 1,
  hash_algorithm: 'SHA-256',
  hash_value: 'abc123',
}

let Download: any

beforeEach(async () => {
  vi.clearAllMocks()
  Download = (await import('../Download')).default
})

function renderDownload() {
  return render(
    <MemoryRouter>
      <Download />
    </MemoryRouter>
  )
}

describe('Download', () => {
  it('shows loading state initially', async () => {
    mockGetAllFiles.mockReturnValue(new Promise(() => {}))
    renderDownload()
    expect(screen.getByText('Memuat File')).toBeInTheDocument()
  })

  it('shows empty state when no files', async () => {
    mockGetAllFiles.mockResolvedValue([])
    renderDownload()
    expect(await screen.findByText('Belum Ada File')).toBeInTheDocument()
  })

  it('renders file list', async () => {
    mockGetAllFiles.mockResolvedValue([mockFile])
    renderDownload()

    expect(await screen.findByText('laporan.pdf')).toBeInTheDocument()
    expect(await screen.findByText('500.0 KB')).toBeInTheDocument()
    expect(await screen.findByText('1 chunk')).toBeInTheDocument()
  })

  it('shows success message after download', async () => {
    mockGetAllFiles.mockResolvedValue([mockFile])
    mockGetChunksByFileId.mockResolvedValue([{ chunk_index: 0, storage_key: 'k', size: 100 }])
    mockDecryptChunks.mockResolvedValue([new ArrayBuffer(10)])
    mockMergeChunks.mockResolvedValue(new Uint8Array(10) as Uint8Array<ArrayBuffer>)
    mockHashFile.mockResolvedValue('abc123')
    mockVerifyHash.mockResolvedValue(undefined)

    renderDownload()
    const user = userEvent.setup()

    await screen.findByText('laporan.pdf')
    await user.click(screen.getByRole('button', { name: /download/i }))

    expect(await screen.findByText(/"laporan.pdf" berhasil di-download \(integrity verified\)\./)).toBeInTheDocument()
  })

  it('shows error when download fails', async () => {
    mockGetAllFiles.mockResolvedValue([mockFile])
    mockGetChunksByFileId.mockRejectedValue(new Error('Database error'))

    renderDownload()
    const user = userEvent.setup()

    await screen.findByText('laporan.pdf')
    await user.click(screen.getByRole('button', { name: /download/i }))

    expect(await screen.findByText('Database error')).toBeInTheDocument()
  })

  it('shows "Downloading..." while downloading', async () => {
    mockGetAllFiles.mockResolvedValue([mockFile])
    mockGetChunksByFileId.mockReturnValue(new Promise(() => {}))

    renderDownload()
    const user = userEvent.setup()

    await screen.findByText('laporan.pdf')
    await user.click(screen.getByRole('button', { name: /download/i }))

    expect(await screen.findByText('Downloading...')).toBeInTheDocument()
  })

  it('refreshes file list on refresh click', async () => {
    mockGetAllFiles.mockResolvedValueOnce([mockFile])
    renderDownload()

    await screen.findByText('laporan.pdf')

    mockGetAllFiles.mockResolvedValueOnce([
      mockFile,
      { ...mockFile, id: 2, original_name: 'new.xlsx' },
    ])
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /refresh file/i }))

    expect(await screen.findByText('new.xlsx')).toBeInTheDocument()
  })
})
