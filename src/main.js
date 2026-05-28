import cytoscape from 'cytoscape'
import { addPerson, deletePerson, getElements, loadTestData } from './data/store.js'

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

// ─── Helpers layout ──────────────────────────────────────────
function runLayout() {
  cy.layout({
    name: 'breadthfirst',
    directed: true,
    spacingFactor: 1.5,
    padding: 40,
  }).run()
}

// ─── Toolbar ─────────────────────────────────────────────────
document.getElementById('btn-reset-view').addEventListener('click', () => {
  cy.fit(undefined, 40)
})

document.getElementById('btn-add-person').addEventListener('click', () => {
  openPanel()
})

document.getElementById('btn-cancel').addEventListener('click', () => {
  closePanel()
})

// ─── Formulaire : ajout d'une personne ───────────────────────
document.getElementById('person-form').addEventListener('submit', (e) => {
  e.preventDefault()

  const firstname = document.getElementById('input-firstname').value.trim()
  const lastname  = document.getElementById('input-lastname').value.trim()
  const birth     = document.getElementById('input-birth').value.trim()
  const death     = document.getElementById('input-death').value.trim()

  // Ajoute dans le store
  const person = addPerson({ firstname, lastname, birth, death })

  // Ajoute dans Cytoscape
  cy.add({
    data: {
      id:        person.id,
      label:     `${firstname} ${lastname}`.trim(),
      firstname,
      lastname,
      birth,
      death,
    }
  })

  runLayout()
  closePanel()
})

// ─── Panneau latéral ─────────────────────────────────────────
function openPanel(personData = null) {
  document.getElementById('person-form').reset()

  if (personData) {
    document.getElementById('panel-title').textContent = 'Modifier la personne'
    document.getElementById('input-firstname').value = personData.firstname ?? ''
    document.getElementById('input-lastname').value  = personData.lastname  ?? ''
    document.getElementById('input-birth').value     = personData.birth     ?? ''
    document.getElementById('input-death').value     = personData.death     ?? ''
  } else {
    document.getElementById('panel-title').textContent = 'Nouvelle personne'
  }

  document.getElementById('panel').classList.remove('panel--hidden')
}

function closePanel() {
  document.getElementById('panel').classList.add('panel--hidden')
}

export { cy }