const NODE_WIDTH  = 160
const NODE_HEIGHT = 80
const H_SPACING   = 40
const V_SPACING   = 140

export function runLayout(cy) {
  const positions = computePositions(cy)
  cy.nodes().filter(n => !n.data('isMidpoint')).forEach(node => {
    const pos = positions[node.id()]
    if (pos) node.position(pos)
  })
  placeMidpoints(cy)
  if (cy.nodes().length > 1) {
    cy.fit(undefined, 100)
  } else {
    cy.zoom(2)
    cy.center()
  }
}

function placeMidpoints(cy) {
  cy.nodes('[isMidpoint]').forEach(mid => {
    const personAId = mid.data('personAId')
    const personBId = mid.data('personBId')
    const posA = cy.getElementById(personAId).position()
    const posB = cy.getElementById(personBId).position()
    if (posA && posB) {
      mid.position({
        x: (posA.x + posB.x) / 2,
        y: (posA.y + posB.y) / 2,
      })
    }
  })
}

function computePositions(cy) {

const parentOf   = new Map()
  const childrenOf = new Map()
  const spousesOf  = new Map()

  cy.edges('[type="parent-child"]').forEach(e => {
    const src = e.source().id()
    const tgt = e.target().id()

    const srcNode = cy.getElementById(src)
    if (srcNode.data('isMidpoint')) {
      const personAId = srcNode.data('personAId')
      const personBId = srcNode.data('personBId')
      if (!parentOf.has(tgt)) parentOf.set(tgt, [])
      if (!childrenOf.has(personAId)) childrenOf.set(personAId, [])
      if (!childrenOf.has(personBId)) childrenOf.set(personBId, [])
      parentOf.get(tgt).push(personAId)
      parentOf.get(tgt).push(personBId)
      childrenOf.get(personAId).push(tgt)
      childrenOf.get(personBId).push(tgt)
    } else {
      if (!parentOf.has(tgt))   parentOf.set(tgt, [])
      if (!childrenOf.has(src)) childrenOf.set(src, [])
      parentOf.get(tgt).push(src)
      childrenOf.get(src).push(tgt)
    }
  })

  cy.edges('[type="spouse-logical"]').forEach(e => {
    const src = e.source().id()
    const tgt = e.target().id()
    if (!spousesOf.has(src)) spousesOf.set(src, [])
    if (!spousesOf.has(tgt)) spousesOf.set(tgt, [])
    spousesOf.get(src).push(tgt)
    spousesOf.get(tgt).push(src)
  })

  const generation = {}
  const hasParent  = new Set(parentOf.keys())

  cy.nodes().filter(n => !n.data('isMidpoint')).forEach(node => {
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

    ;(spousesOf.get(id) || []).forEach(sid => {
      if (generation[sid] === undefined) {
        generation[sid] = gen
        if (!visited.has(sid)) { visited.add(sid); queue.push(sid) }
      }
    })

    ;(childrenOf.get(id) || []).forEach(cid => {
      if (generation[cid] === undefined) {
        generation[cid] = gen + 1
        if (!visited.has(cid)) { visited.add(cid); queue.push(cid) }
      }
    })
  }

  cy.nodes().filter(n => !n.data('isMidpoint')).forEach(node => {
    const id = node.id()
    if (generation[id] !== undefined) return
    const children  = childrenOf.get(id) || []
    const childGens = children.map(cid => generation[cid]).filter(g => g !== undefined)
    generation[id]  = childGens.length > 0 ? Math.min(...childGens) - 1 : 0
  })

  let changed = true
  while (changed) {
    changed = false
    cy.edges('[type="spouse-logical"]').forEach(e => {
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

  const byGen = {}
  cy.nodes().filter(n => !n.data('isMidpoint')).forEach(node => {
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
    const ids = byGen[g]

    // Trier les enfants par X de leur parent
    ids.sort((a, b) => {
      const parentsA = parentOf.get(a) || []
      const parentsB = parentOf.get(b) || []
      const xA = parentsA.length
        ? parentsA.reduce((sum, pid) => sum + (positions[pid]?.x ?? 0), 0) / parentsA.length
        : positions[a]?.x ?? 0
      const xB = parentsB.length
        ? parentsB.reduce((sum, pid) => sum + (positions[pid]?.x ?? 0), 0) / parentsB.length
        : positions[b]?.x ?? 0
      return xA - xB
    })

    // Recalculer les positions X après le tri
    const total  = ids.length
    const totalW = total * NODE_WIDTH + (total - 1) * H_SPACING
    const startX = -totalW / 2 + NODE_WIDTH / 2
    ids.forEach((id, i) => {
      positions[id].x = startX + i * (NODE_WIDTH + H_SPACING)
    })

    // Ajuster chaque enfant sous ses parents
    ids.forEach(id => {
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

    resolveOverlaps(ids, positions)

    // Recentrer après résolution
    const xs      = ids.map(id => positions[id].x)
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
    ids.forEach(id => { positions[id].x -= centerX })
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