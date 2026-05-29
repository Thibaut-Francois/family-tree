import cytoscape from 'cytoscape'
import { addPerson, updatePerson, deletePerson, getPerson, getElements, initRoot, exportData, importData } from './data/store.js'
import { initEvents, addChild, addParent, addSpouse, updateNode, removeNode } from './graph/events.js'
import { runLayout } from './graph/layout.js'

// ─── Nœud de départ (seulement si pas de données importées) ──
const root = initRoot()

// ─── Initialisation Cytoscape ────────────────────────────────
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
      selector: 'edge[type="parent-child"]',
      style: {
        'width': 2,
        'line-color': '#a0b8a8',
        'target-arrow-color': '#a0b8a8',
        'target-arrow-shape': 'triangle',
        'curve-style': 'taxi',
        'taxi-direction': 'downward',
        'taxi-turn': 50,
      }
    },
    {
      selector: 'edge[type="spouse"]',
      style: {
        'width': 2,
        'line-color': '#b8a0b0',
        'line-style': 'dashed',
        'curve-style': 'straight',
        'target-arrow-shape': 'none',
      }
    },
  ],

  layout: { name: 'preset' },
  userZoomingEnabled: true,
  userPanningEnabled: true,
  boxSelectionEnabled: false,
  autoungrabify: true, // nœuds immobiles
})

// ─── Layout initial ───────────────────────────────────────────
runLayout(cy)

// ─── État panneau ─────────────────────────────────────────────
let currentPersonId = null
let pendingAction   = null // 'edit' | 'add-child' | 'add-parent' | 'add-spouse'

// ─── Fonctions panneau ────────────────────────────────────────
function openMenu(person) {
  console.log('openMenu appelé pour', person.firstname)
  currentPersonId = person.id
  document.getElementById('panel-name').textContent = `${person.firstname} ${person.lastname}`.trim() || 'Sans nom'
  const dates = [person.birth, person.death].filter(Boolean).join(' — ')
  document.getElementById('panel-dates').textContent = dates

  document.getElementById('panel-menu').classList.remove('panel--hidden')
  document.getElementById('panel-form').classList.add('panel--hidden')
  document.getElementById('panel').classList.remove('panel--hidden')
}

function openForm(title) {
  document.getElementById('form-title').textContent = title
  document.getElementById('person-form').reset()
  document.getElementById('panel-menu').classList.add('panel--hidden')
  document.getElementById('panel-form').classList.remove('panel--hidden')
}

function closePanel() {
  document.getElementById('panel').classList.add('panel--hidden')
  document.getElementById('panel-menu').classList.remove('panel--hidden')
  document.getElementById('panel-form').classList.add('panel--hidden')
  currentPersonId = null
  pendingAction   = null
}

// ─── Événements graph ─────────────────────────────────────────
initEvents(cy, { openPanel: openMenu, closePanel })

// ─── Boutons menu ─────────────────────────────────────────────
document.getElementById('btn-edit').addEventListener('click', () => {
  const person = getPerson(currentPersonId)
  if (!person) return
  pendingAction = 'edit'
  openForm('Modifier')
  document.getElementById('input-firstname').value = person.firstname ?? ''
  document.getElementById('input-lastname').value  = person.lastname  ?? ''
  document.getElementById('input-birth').value     = person.birth     ?? ''
  document.getElementById('input-death').value     = person.death     ?? ''
})

document.getElementById('btn-add-parent').addEventListener('click', () => {
  pendingAction = 'add-parent'
  openForm('+ Parent')
})

document.getElementById('btn-add-child').addEventListener('click', () => {
  pendingAction = 'add-child'
  openForm('+ Enfant')
})

document.getElementById('btn-add-spouse').addEventListener('click', () => {
  pendingAction = 'add-spouse'
  openForm('+ Conjoint')
})

document.getElementById('btn-delete').addEventListener('click', () => {
  if (!currentPersonId) return
  removeNode(cy, currentPersonId)
  closePanel()
})

document.getElementById('btn-back').addEventListener('click', () => {
  const person = getPerson(currentPersonId)
  if (person) openMenu(person)
  else closePanel()
})

// ─── Soumission formulaire ────────────────────────────────────
document.getElementById('person-form').addEventListener('submit', (e) => {
  e.preventDefault()

  const firstname = document.getElementById('input-firstname').value.trim()
  const lastname  = document.getElementById('input-lastname').value.trim()
  const birth     = document.getElementById('input-birth').value.trim()
  const death     = document.getElementById('input-death').value.trim()
  const data      = { firstname, lastname, birth, death }

  if (pendingAction === 'edit') {
    updateNode(cy, currentPersonId, data)

  } else if (pendingAction === 'add-child') {
    addChild(cy, currentPersonId, data)

  } else if (pendingAction === 'add-parent') {
    addParent(cy, currentPersonId, data)

  } else if (pendingAction === 'add-spouse') {
    addSpouse(cy, currentPersonId, data)
  }

  closePanel()
})

// ─── Export JSON ──────────────────────────────────────────────
document.getElementById('btn-export').addEventListener('click', () => {
  const data     = exportData()
  const json     = JSON.stringify(data, null, 2)
  const blob     = new Blob([json], { type: 'application/json' })
  const url      = URL.createObjectURL(blob)
  const a        = document.createElement('a')
  a.href         = url
  a.download     = 'arbre-genealogique.json'
  a.click()
  URL.revokeObjectURL(url)
})

// ─── Import JSON ──────────────────────────────────────────────
document.getElementById('input-import').addEventListener('change', (e) => {
  const file = e.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result)
      console.log('données importées :', data)
      importData(data)
      console.log('éléments après import :', getElements())

      // Recharge Cytoscape avec les nouvelles données
      cy.elements().remove()
      cy.add(getElements())
      runLayout(cy)
    } catch {
      alert('Fichier JSON invalide.')
    }
  }
  reader.readAsText(file)
})

export { cy }