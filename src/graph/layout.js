const NODE_WIDTH  = 140
const NODE_HEIGHT = 60
const H_SPACING   = 60
const V_SPACING   = 120

export function runLayout(cy) {
  const positions = computePositions(cy)
  cy.nodes().forEach(node => {
    const pos = positions[node.id()]
    if (pos) node.position(pos)
  })
  cy.fit(undefined, 60)
}

function computePositions(cy) {
  const generation = {}

  // 1. Construire un ensemble de tous les ids qui ont un parent parent-child
  const hasParent = new Set(
    cy.edges('[type="parent-child"]').map(e => e.target().id())
  )

  // 2. Construire un ensemble de tous les ids qui ont un conjoint déjà placé
  //    → les conjoints purs (sans parent-child entrant ET sans lien descendant)
  //    ne sont PAS des racines
  const spouseOf = new Map() // id → id du partenaire
  cy.edges('[type="spouse"]').forEach(e => {
    spouseOf.set(e.source().id(), e.target().id())
    spouseOf.set(e.target().id(), e.source().id())
  })

  // 3. Les vraies racines = pas de parent ET pas un conjoint d'un non-racine
  //    On part simple : racine = pas de lien parent-child entrant
  //    ET pas de conjoint qui a lui-même un parent
  const roots = cy.nodes().filter(n => {
    const id = n.id()
    if (hasParent.has(id)) return false
    const partner = spouseOf.get(id)
    if (partner && hasParent.has(partner)) return false
    return true
  })

  // 4. BFS parent-child pour assigner les générations
  const queue = []
  roots.forEach(r => {
    generation[r.id()] = 0
    queue.push(r)
  })

  while (queue.length) {
    const node = queue.shift()
    const gen  = generation[node.id()]

    cy.edges('[type="parent-child"]').forEach(e => {
      if (e.source().id() !== node.id()) return
      const child = e.target()
      if (generation[child.id()] === undefined) {
        generation[child.id()] = gen + 1
        queue.push(child)
      }
    })
  }

  // 5. Propager aux conjoints (même génération que leur partenaire)
  cy.edges('[type="spouse"]').forEach(e => {
    const srcId  = e.source().id()
    const tgtId  = e.target().id()
    const srcGen = generation[srcId]
    const tgtGen = generation[tgtId]

    if (srcGen !== undefined && tgtGen === undefined) {
      generation[tgtId] = srcGen
    } else if (tgtGen !== undefined && srcGen === undefined) {
      generation[srcId] = tgtGen
    }
  })

  // 6. Grouper par génération en mettant les conjoints côte à côte
  const byGen = {}
  cy.nodes().forEach(node => {
    const g = generation[node.id()] ?? 0
    if (!byGen[g]) byGen[g] = []
    byGen[g].push(node.id())
  })

  Object.keys(byGen).forEach(g => {
    const ids     = byGen[g]
    const ordered = []
    const placed  = new Set()

    ids.forEach(id => {
      if (placed.has(id)) return
      ordered.push(id)
      placed.add(id)
      const partner = spouseOf.get(id)
      if (partner && ids.includes(partner) && !placed.has(partner)) {
        ordered.push(partner)
        placed.add(partner)
      }
    })

    byGen[g] = ordered
  })

  // 7. Calculer les positions X/Y
  const positions = {}
  const gens = Object.keys(byGen).map(Number).sort((a, b) => a - b)

  gens.forEach(g => {
    const ids    = byGen[g]
    const total  = ids.length
    const totalW = total * NODE_WIDTH + (total - 1) * H_SPACING
    const startX = -totalW / 2 + NODE_WIDTH / 2

    ids.forEach((id, i) => {
      positions[id] = {
        x: startX + i * (NODE_WIDTH + H_SPACING),
        y: g * (NODE_HEIGHT + V_SPACING),
      }
    })
  })

  console.log('générations :', generation)
  console.log('positions :', positions)

  return positions
}