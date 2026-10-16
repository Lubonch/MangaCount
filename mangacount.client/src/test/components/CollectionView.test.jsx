import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test-utils'

// setup.js mockea CollectionView globalmente para el resto de los tests; acá lo usamos real.
vi.unmock('../../components/CollectionView')

import CollectionView from '../../components/CollectionView'

const ongoingEntry = () => ({
  id: 1,
  quantity: 9,
  pending: null,
  priority: false,
  manga: { id: 1, name: 'Konosuba', volumes: 0, format: { name: 'Unknown' }, publisher: { name: 'Unknown' } },
})

const entryWithTotal = () => ({
  id: 2,
  quantity: 1,
  pending: null,
  priority: false,
  manga: { id: 2, name: 'Bleach', volumes: 26, format: { name: 'Tankoubon' }, publisher: { name: 'Ivrea' } },
})

describe('CollectionView: series sin total de tomos', () => {
  it('muestra "owned / ??" y ningún 0 suelto', () => {
    render(<CollectionView entries={[ongoingEntry()]} mangas={[]} selectedProfile={null} />)
    expect(screen.getByText(/Owned: 9 \/ \?\?/)).toBeInTheDocument()
    expect(screen.queryByText('0', { exact: true })).not.toBeInTheDocument()
  })

  it('muestra "owned / total" cuando hay total', () => {
    render(<CollectionView entries={[entryWithTotal()]} mangas={[]} selectedProfile={null} />)
    expect(screen.getByText(/Owned: 1 \/ 26/)).toBeInTheDocument()
  })
})
