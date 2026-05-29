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
    { data: { id: child.id, label: formatLabel(child), ...child } },
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
    { data: { id: parent.id, label: formatLabel(parent), ...parent } },
    { data: { id: link.id, source: link.source, target: link.target, type: link.type } },
  ])

  runLayout(cy)
  return parent
}

// ─── Ajouter un conjoint ─────────────────────────────────────

export function addSpouse(cy, personId, personData) {
  const spouse = addPerson(personData)
  const link   = addLink(personId, spouse.id, 'spouse')

  cy.add([
    { data: { id: spouse.id, label: formatLabel(spouse), ...spouse } },
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
  return `${p.firstname} ${p.lastname}`.trim()
}