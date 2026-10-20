import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test-utils'
import userEvent from '@testing-library/user-event'
import ImportDuplicatesModal from '../../components/ImportDuplicatesModal'

const duplicate = (overrides = {}) => ({
  rowIndex: 0,
  lineNumber: 2,
  source: 'existing',
  incoming: {
    title: 'Kuuga',
    quantity: 5,
    totalVolumes: 10,
    pending: null,
    priority: false,
    formatName: 'B6',
    publisherName: 'Panini',
  },
  candidate: {
    mangaId: 7,
    title: 'Kamen Rider Kuuga',
    volumes: 10,
    formatName: 'B6',
    publisherName: 'Panini',
    entry: { quantity: 4, pending: '5-6' },
  },
  ...overrides,
})

describe('ImportDuplicatesModal', () => {
  it('no renderiza nada si está cerrado', () => {
    render(<ImportDuplicatesModal isOpen={false} duplicates={[duplicate()]} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByText('Posibles duplicados')).not.toBeInTheDocument()
  })

  it('muestra ambos lados del par y el progreso', () => {
    render(<ImportDuplicatesModal isOpen duplicates={[duplicate()]} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Posibles duplicados')).toBeInTheDocument()
    expect(screen.getByText('Kuuga')).toBeInTheDocument()
    expect(screen.getByText('Kamen Rider Kuuga')).toBeInTheDocument()
    expect(screen.getByText('En el archivo')).toBeInTheDocument()
    expect(screen.getByText('En tu colección')).toBeInTheDocument()
    expect(screen.getByText('0 de 1 resueltos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar' })).toBeDisabled()
  })

  it('exige resolver todos los pares antes de importar', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const duplicates = [
      duplicate(),
      duplicate({
        rowIndex: 1,
        lineNumber: 3,
        source: 'batch',
        incoming: { ...duplicate().incoming, title: 'Kamen Rider Kuuga' },
        candidate: {
          rowIndex: 0,
          lineNumber: 2,
          title: 'Kuuga',
          volumes: 10,
          quantity: 5,
          formatName: 'B6',
          publisherName: 'Panini',
        },
      }),
    ]
    render(<ImportDuplicatesModal isOpen duplicates={duplicates} onConfirm={onConfirm} onCancel={vi.fn()} />)

    const sameButtons = screen.getAllByRole('button', { name: 'Son lo mismo' })
    await user.click(sameButtons[0])
    expect(screen.getByRole('button', { name: 'Importar' })).toBeDisabled()

    const differentButtons = screen.getAllByRole('button', { name: 'No son lo mismo' })
    await user.click(differentButtons[1])
    expect(screen.getByText('2 de 2 resueltos')).toBeInTheDocument()

    const confirm = screen.getByRole('button', { name: 'Importar' })
    expect(confirm).toBeEnabled()
    await user.click(confirm)

    expect(onConfirm).toHaveBeenCalledWith([
      { rowIndex: 0, same: true },
      { rowIndex: 1, same: false },
    ])
  })

  it('muestra la fila del lote y la entry actual', () => {
    const batch = duplicate({
      source: 'batch',
      candidate: {
        rowIndex: 0,
        lineNumber: 2,
        title: 'Kuuga',
        volumes: 10,
        quantity: 5,
        formatName: 'B6',
        publisherName: 'Panini',
      },
    })
    render(<ImportDuplicatesModal isOpen duplicates={[batch]} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText('Otra fila del archivo')).toBeInTheDocument()
    expect(screen.getByText('Fila 2')).toBeInTheDocument()
    expect(screen.queryByText(/Entry actual/)).not.toBeInTheDocument()
  })

  it('muestra la entry actual del manga existente', () => {
    render(<ImportDuplicatesModal isOpen duplicates={[duplicate()]} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/Entry actual: 4 comprados/)).toBeInTheDocument()
    expect(screen.getByText(/pendiente: 5-6/)).toBeInTheDocument()
  })

  it('cancelar llama a onCancel sin confirmar', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(<ImportDuplicatesModal isOpen duplicates={[duplicate()]} onConfirm={onConfirm} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('muestra el error y deshabilita acciones mientras commitea', () => {
    render(
      <ImportDuplicatesModal
        isOpen
        duplicates={[duplicate()]}
        isCommitting
        error="Falló la importación: boom"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('Falló la importación: boom')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Importando…' })).toBeDisabled()
  })
})
