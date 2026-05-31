const NODE_WIDTH  = 160
const NODE_HEIGHT = 80
const H_SPACING   = 40
const V_SPACING   = 140

export function runLayout(cy) {
  const positions = computePositions(cy)
  cy.nodes().forEach(node => {
    const pos = positions[node.id()]
    if (pos) node.position(pos)
  })
  // ─── Layout initial ───────────────────────────────────────────
  if (cy.nodes().length > 1) {
    cy.fit(undefined, 100)
  } else {
    cy.zoom(2)
    cy.center()
  }
}

function computePositions(cy) {

  // ─── 1. Maps de relations ─────────────────────────────────────
  const parentOf   = new Map()
  const childrenOf = new Map()
  const spousesOf  = new Map()

  cy.edges('[type="parent-child"]').forEach(e => {
    const src = e.source().id()
    const tgt = e.target().id()
    if (!parentOf.has(tgt))   parentOf.set(tgt, [])
    if (!childrenOf.has(src)) childrenOf.set(src, [])
    parentOf.get(tgt).push(src)
    childrenOf.get(src).push(tgt)
  })

  cy.edges('[type="spouse"]').forEach(e => {
    const src = e.source().id()
    const tgt = e.target().id()
    if (!spousesOf.has(src)) spousesOf.set(src, [])
    if (!spousesOf.has(tgt)) spousesOf.set(tgt, [])
    spousesOf.get(src).push(tgt)
    spousesOf.get(tgt).push(src)
  })

  // ─── 2. Générations via BFS vers le bas ──────────────────────
  const generation = {}
  const hasParent  = new Set(parentOf.keys())

  // Racines = pas de parent ET pas conjoint d'un enfant
  cy.nodes().forEach(node => {
    const id = node.id()
    if (hasParent.has(id)) return
    const isSpouseOfChild = (spousesOf.get(id) || []).some(sid => hasParent.has(sid))
    if (isSpouseOfChild) return
    generation[id] = 0
  })

  const queue   = Object.keys(generation).slice()
  const visited = new Set(queue)

  while (queue.length) {
    const id  = queue.shift()
    const gen = generation[id]

    // Conjoints → même génération
    ;(spousesOf.get(id) || []).forEach(sid => {
      if (generation[sid] === undefined) {
        generation[sid] = gen
        if (!visited.has(sid)) { visited.add(sid); queue.push(sid) }
      }
    })

    // Enfants → gen + 1
    ;(childrenOf.get(id) || []).forEach(cid => {
      if (generation[cid] === undefined) {
        generation[cid] = gen + 1
        if (!visited.has(cid)) { visited.add(cid); queue.push(cid) }
      }
    })
  }

  // ─── 3. Parents ajoutés manuellement (gen négative) ──────────
  cy.nodes().forEach(node => {
    const id = node.id()
    if (generation[id] !== undefined) return
    const children  = childrenOf.get(id) || []
    const childGens = children.map(cid => generation[cid]).filter(g => g !== undefined)
    generation[id]  = childGens.length > 0 ? Math.min(...childGens) - 1 : 0
  })

  // ─── 4. Correction : conjoints forcés à la gen de leur partenaire ──
  let changed = true
  while (changed) {
    changed = false
    cy.edges('[type="spouse"]').forEach(e => {
      const srcId  = e.source().id()
      const tgtId  = e.target().id()
      const srcGen = generation[srcId]
      const tgtGen = generation[tgtId]
      if (srcGen === tgtGen) return

      const srcHasChildren = (childrenOf.get(srcId) || []).length > 0
      const tgtHasChildren = (childrenOf.get(tgtId) || []).length > 0

      if (srcHasChildren && !tgtHasChildren) {
        generation[tgtId] = srcGen
      } else if (tgtHasChildren && !srcHasChildren) {
        generation[srcId] = tgtGen
      } else {
        const minGen = Math.min(srcGen, tgtGen)
        generation[srcId] = minGen
        generation[tgtId] = minGen
      }
      changed = true
    })
  }

  // ─── 5. Grouper et ordonner par génération ───────────────────
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

    const anchors = ids.filter(id => (parentOf.get(id) || []).length > 0)
    const rest    = ids.filter(id => !anchors.includes(id))

    ;[...anchors, ...rest].forEach(id => {
      if (placed.has(id)) return
      placed.add(id)
      ordered.push(id)
      ;(spousesOf.get(id) || []).forEach(sid => {
        if (!placed.has(sid) && ids.includes(sid)) {
          placed.add(sid)
          ordered.push(sid)
        }
      })
    })

    byGen[g] = ordered
  })

  // ─── 6. Positions X/Y ────────────────────────────────────────
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

  // ─── 7. Ajuster X des enfants sous leurs parents ─────────────
  gens.forEach(g => {
    byGen[g].forEach(id => {
      const parents = parentOf.get(id) || []
      if (parents.length === 0) return
      const parentXs = parents.map(pid => positions[pid]?.x ?? 0)
      const targetX  = parentXs.reduce((a, b) => a + b, 0) / parentXs.length
      const delta    = targetX - positions[id].x
      positions[id].x += delta
      ;(spousesOf.get(id) || []).forEach(sid => {
        if (positions[sid]) positions[sid].x += delta
      })
    })
    resolveOverlaps(byGen[g], positions)
  })

  return positions
}

function resolveOverlaps(ids, positions) {
  const minDist = NODE_WIDTH + H_SPACING
  for (let pass = 0; pass < 10; pass++) {
    let changed = false
    for (let i = 1; i < ids.length; i++) {
      const prev = positions[ids[i - 1]]
      const curr = positions[ids[i]]
      if (curr.x - prev.x < minDist) {
        curr.x = prev.x + minDist
        changed = true
      }
    }
    if (!changed) break
  }
  const xs      = ids.map(id => positions[id].x)
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
  ids.forEach(id => { positions[id].x -= centerX })
}