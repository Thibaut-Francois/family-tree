import cytoscape from 'cytoscape'

const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: [
    { data: { id: 'p1', label: 'Marie Dupont', birth: '1920', death: '1998' } },
    { data: { id: 'p2', label: 'Jean Dupont', birth: '1918', death: '2001' } },
    { data: { id: 'p3', label: 'Pierre Dupont', birth: '1945' } },
    { data: { id: 'p4', label: 'Anne Dupont', birth: '1948' } },
    { data: { id: 'e1', source: 'p1', target: 'p3' } },
    { data: { id: 'e2', source: 'p1', target: 'p4' } },
    { data: { id: 'e3', source: 'p2', target: 'p3' } },
    { data: { id: 'e4', source: 'p2', target: 'p4' } },
  ],
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

document.getElementById('btn-reset-view').addEventListener('click', () => cy.fit(undefined, 40))
document.getElementById('btn-add-person').addEventListener('click', () => openPanel())
document.getElementById('btn-cancel').addEventListener('click', () => closePanel())

document.getElementById('person-form').addEventListener('submit', (e) => {
  e.preventDefault()
  const firstname = document.getElementById('input-firstname').value.trim()
  const lastname  = document.getElementById('input-lastname').value.trim()
  const birth     = document.getElementById('input-birth').value.trim()
  const death     = document.getElementById('input-death').value.trim()
  const id        = `p_${Date.now()}`
  const label     = `${firstname} ${lastname}`.trim()
  cy.add({ data: { id, label, birth, death } })
  cy.layout({ name: 'breadthfirst', directed: true, spacingFactor: 1.5, padding: 40 }).run()
  closePanel()
})

function openPanel() {
  document.getElementById('person-form').reset()
  document.getElementById('panel-title').textContent = 'Nouvelle personne'
  document.getElementById('panel').classList.remove('panel--hidden')
}

function closePanel() {
  document.getElementById('panel').classList.add('panel--hidden')
}

export { cy }