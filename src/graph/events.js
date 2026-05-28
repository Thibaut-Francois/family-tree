// ─── Gestion des événements sur le graph ─────────────────────

import { updatePerson, deletePerson, addLink, getPerson } from '../data/store.js'

let linkMode = false
let linkSource = null

// ─── Initialisation ──────────────────────────────────────────

export function initEvents(cy, { openPanel, closePanel }) {

  cy.on('tap', (e) => {
    if (e.target === cy) {
      // Clic sur le fond
      closePanel()
      if (linkMode) exitLinkMode(cy)
      return
    }

    // Clic sur un nœud
    const node = e.target
    if (!node.isNode()) return

    if (linkMode) {
      if (linkSource && linkSource.id() !== node.id()) {
        const link = addLink(linkSource.id(), node.id())
        cy.add({ data: { id: link.id, source: link.parentId, target: link.childId } })
        runLayout(cy)
      }
      exitLinkMode(cy)
      return
    }

    const person = getPerson(node.id())
    if (person) openPanel(person)
  })
}

// ─── Mode "relier deux personnes" ────────────────────────────

export function startLinkMode(cy, sourceId) {
  linkMode   = true
  linkSource = cy.getElementById(sourceId)

  cy.nodes().addClass('dim')
  linkSource.removeClass('dim').addClass('link-source')

  document.getElementById('cy').style.cursor = 'crosshair'
}

function exitLinkMode(cy) {
  linkMode   = false
  linkSource = null
  cy.nodes().removeClass('dim link-source')
  document.getElementById('cy').style.cursor = 'default'
}

// ─── Mise à jour d'un nœud dans Cytoscape ────────────────────

export function updateNode(cy, id, fields) {
  const node = cy.getElementById(id)
  if (!node) return
  const label = `${fields.firstname ?? ''} ${fields.lastname ?? ''}`.trim()
  node.data({ ...fields, label })
}

// ─── Suppression d'un nœud dans Cytoscape ────────────────────

export function removeNode(cy, id) {
  deletePerson(id)
  cy.getElementById(id).remove()
}

// ─── Layout ──────────────────────────────────────────────────

export function runLayout(cy) {
  cy.layout({
    name: 'breadthfirst',
    directed: true,
    spacingFactor: 1.5,
    padding: 40,
  }).run()
}