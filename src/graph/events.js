// ─── Gestion des événements sur le graph ─────────────────────

import { addPerson, updatePerson, deletePerson, addLink, getPerson } from '../data/store.js'
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

export function addChild(cy, parentId, personData) {
  const child = addPerson(personData)
  const link  = addLink(parentId, child.id, 'parent-child')

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
  const spouse = addPerson({ ...personData, isSpouse: true })
  const link   = addLink(personId, spouse.id, 'spouse')

  cy.add([
  { data: { ...spouse, id: spouse.id, label: formatLabel(spouse), displayLabel: formatLabel(spouse) } },
  { data: { id: link.id, source: link.source, target: link.target, type: link.type } },
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