// ─── Gestion des événements sur le graph ─────────────────────

import { addPerson, updatePerson, deletePerson, addLink, getPerson, addMidpoint, getMidpoint } from '../data/store.js'
import { runLayout } from './layout.js'

// ─── Initialisation ──────────────────────────────────────────

export function initEvents(cy, { openPanel, closePanel, openForm }) {

  cy.on('tap', (e) => {
    if (e.target === cy) {
      closePanel()
      return
    }

    const el = e.target
    if (!el.isNode()) return

    const person = getPerson(el.id())
    if (person) openPanel(person)
  })
}

// ─── Ajouter un enfant ───────────────────────────────────────

export function addChild(cy, parentId, personData, otherParentId = null) {
  const child = addPerson(personData)

  let sourceId = parentId

  if (otherParentId) {
    console.log('cherche midpoint entre', parentId, 'et', otherParentId)
    console.log('midpoints disponibles:', cy.nodes('[isMidpoint]').map(n => ({
      id: n.id(),
      a: n.data('personAId'),
      b: n.data('personBId')
    })))

    const midNode = cy.nodes('[isMidpoint]').filter(n =>
      (n.data('personAId') === parentId && n.data('personBId') === otherParentId) ||
      (n.data('personAId') === otherParentId && n.data('personBId') === parentId)
    ).first()
    if (midNode.length) sourceId = midNode.id()
  }

  const link = addLink(sourceId, child.id, 'parent-child')

  cy.add([
    { data: { ...child, id: child.id, label: formatLabel(child), displayLabel: formatLabel(child) } },
    { data: { id: link.id, source: link.source, target: link.target, type: link.type } },
  ])

  runLayout(cy)
  return child
}

// ─── Ajouter un parent ───────────────────────────────────────

export function addParent(cy, childId, personData) {
  const parent = addPerson(personData)
  const link   = addLink(parent.id, childId, 'parent-child')

  cy.add([
  { data: { ...parent, id: parent.id, label: formatLabel(parent), displayLabel: formatLabel(parent) } },
  { data: { id: link.id, source: link.source, target: link.target, type: link.type } },
])

  runLayout(cy)
  return parent
}

// ─── Ajouter un conjoint ─────────────────────────────────────

export function addSpouse(cy, personId, personData) {
  const spouse   = addPerson({ ...personData, isSpouse: true })
  const midpoint = addMidpoint(personId, spouse.id)
  
  // Lien spouse remplacé par deux liens via le midpoint
  const linkA = addLink(personId,   midpoint.id, 'spouse')
  const linkB = addLink(midpoint.id, spouse.id,  'spouse')
  // Lien logique pour retrouver la relation (pas affiché)
  const linkSpouse = addLink(personId, spouse.id, 'spouse-logical')

  cy.add([
    { data: { ...spouse, id: spouse.id, label: formatLabel(spouse), displayLabel: formatLabel(spouse) } },
    { data: { id: midpoint.id, isMidpoint: true, personAId: personId, personBId: spouse.id, label: '' } },
    { data: { id: linkA.id, source: linkA.source, target: linkA.target, type: linkA.type } },
    { data: { id: linkB.id, source: linkB.source, target: linkB.target, type: linkB.type } },
    { data: { id: linkSpouse.id, source: linkSpouse.source, target: linkSpouse.target, type: linkSpouse.type } },
  ])

  runLayout(cy)
  return spouse
}

// ─── Mettre à jour un nœud ───────────────────────────────────

export function updateNode(cy, id, fields) {
  const updated = updatePerson(id, fields)
  if (!updated) return
  const node = cy.getElementById(id)
  node.data({ ...fields, label: formatLabel(updated) })
}

// ─── Supprimer un nœud ───────────────────────────────────────

export function removeNode(cy, id) {
  deletePerson(id)
  cy.getElementById(id).remove()
}

// ─── Utilitaire ──────────────────────────────────────────────

function formatLabel(p) {
  const name  = `${p.firstname} ${p.lastname}`.trim()
  const birth = p.birth ? `${p.birth}` : ''
  const death = p.death ? `${p.death}` : ''
  const dates = [birth, death].filter(Boolean).join(' - ')
  return dates ? `${name}\n${dates}` : name
}