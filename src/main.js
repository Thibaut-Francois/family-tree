import cytoscape from 'cytoscape'
import { addPerson, updatePerson, getElements, loadTestData, getPerson } from './data/store.js'
import { initEvents, startLinkMode, updateNode, removeNode, runLayout } from './graph/events.js'

// ─── Données de test ─────────────────────────────────────────
loadTestData()

// ─── Initialisation de Cytoscape ─────────────────────────────
const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: getElements(),

  style: [
    {
      selector: 'node',
      style: {
        'shape': 'round-rectangle',
        'width': 140,
        'height': 60,
        'background-color': '#ffffff',
        'border-width': 2,
        'border-color': '#4a7c59',
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '12px',
        'font-family': 'system-ui, sans-serif',
        'color': '#2c2c2c',
        'text-wrap': 'wrap',
        'text-max-width': '120px',
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-color': '#3a6347',
        'border-width': 3,
        'background-color': '#edf6f0',
      }
    },
    {
      selector: 'node.dim',
      style: {
        'opacity': 0.4,
      }
    },
    {
      selector: 'node.link-source',
      style: {
        'border-color': '#e8a020',
        'border-width': 3,
        'opacity': 1,
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#a0b8a8',
        'target-arrow-color': '#a0b8a8',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
      }
    },
  ],

  layout: {
    name: 'breadthfirst',
    directed: true,
    spacingFactor: 1.5,
    padding: 40,
  },

  userZoomingEnabled: true,
  userPanningEnabled: true,
  boxSelectionEnabled: false,
})

// ─── État du panneau ─────────────────────────────────────────
let currentPersonId = null  // id de la personne en cours d'édition

// ─── Panneau latéral ─────────────────────────────────────────
function openPanel(personData = null) {
  document.getElementById('person-form').reset()
  const isEdit = !!personData

  document.getElementById('panel-title').textContent = isEdit ? 'Modifier' : 'Nouvelle personne'
  document.getElementById('btn-link').style.display   = isEdit ? 'block' : 'none'
  document.getElementById('btn-delete').style.display = isEdit ? 'block' : 'none'

  if (isEdit) {
    currentPersonId = personData.id
    document.getElementById('input-firstname').value = personData.firstname ?? ''
    document.getElementById('input-lastname').value  = personData.lastname  ?? ''
    document.getElementById('input-birth').value     = personData.birth     ?? ''
    document.getElementById('input-death').value     = personData.death     ?? ''
  } else {
    currentPersonId = null
  }

  document.getElementById('panel').classList.remove('panel--hidden')
}

function closePanel() {
  document.getElementById('panel').classList.add('panel--hidden')
  currentPersonId = null
}

// ─── Événements graph ─────────────────────────────────────────
initEvents(cy, { openPanel, closePanel })

// ─── Toolbar ─────────────────────────────────────────────────
document.getElementById('btn-reset-view').addEventListener('click', () => {
  cy.fit(undefined, 40)
})

document.getElementById('btn-add-person').addEventListener('click', () => {
  openPanel()
})

// ─── Formulaire ──────────────────────────────────────────────
document.getElementById('person-form').addEventListener('submit', (e) => {
  e.preventDefault()

  const firstname = document.getElementById('input-firstname').value.trim()
  const lastname  = document.getElementById('input-lastname').value.trim()
  const birth     = document.getElementById('input-birth').value.trim()
  const death     = document.getElementById('input-death').value.trim()

  if (currentPersonId) {
    // Mode édition
    updatePerson(currentPersonId, { firstname, lastname, birth, death })
    updateNode(cy, currentPersonId, { firstname, lastname, birth, death })
  } else {
    // Mode création
    const person = addPerson({ firstname, lastname, birth, death })
    cy.add({
      data: {
        id: person.id,
        label: `${firstname} ${lastname}`.trim(),
        firstname, lastname, birth, death,
      }
    })
    runLayout(cy)
  }

  closePanel()
})

// ─── Bouton Relier ───────────────────────────────────────────
document.getElementById('btn-link').addEventListener('click', () => {
  if (!currentPersonId) return
  closePanel()
  startLinkMode(cy, currentPersonId)
})

// ─── Bouton Supprimer ────────────────────────────────────────
document.getElementById('btn-delete').addEventListener('click', () => {
  if (!currentPersonId) return
  removeNode(cy, currentPersonId)
  closePanel()
})

// ─── Bouton Annuler ───────────────────────────────────────────
document.getElementById('btn-cancel').addEventListener('click', () => {
  closePanel()
})

export { cy }