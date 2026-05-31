// ─── Store : source de vérité de l'arbre généalogique ────────

const state = {
  persons: new Map(), // id → { id, firstname, lastname, birth, death }
  links:   new Map(), // id → { id, source, target, type: 'parent-child' | 'spouse' }
}

// ─── Utilitaires ─────────────────────────────────────────────

function uid() {
  return `_${Math.random().toString(36).slice(2, 9)}`
}

// ─── Personnes ───────────────────────────────────────────────

export function addPerson({ firstname, lastname = '', birth = '', death = '', isSpouse = false }) {
  const id = `p${uid()}`
  const person = { id, firstname, lastname, birth, death, isSpouse }
  state.persons.set(id, person)
  return person
}

export function updatePerson(id, fields) {
  const person = state.persons.get(id)
  if (!person) return null
  const updated = { ...person, ...fields }
  state.persons.set(id, updated)
  return updated
}

export function deletePerson(id) {
  state.persons.delete(id)
  for (const [lid, link] of state.links) {
    if (link.source === id || link.target === id) {
      state.links.delete(lid)
    }
  }
}

export function getPerson(id) {
  return state.persons.get(id) ?? null
}

export function getAllPersons() {
  return [...state.persons.values()]
}

// ─── Liens ───────────────────────────────────────────────────

export function addLink(source, target, type = 'parent-child') {
  // Évite les doublons
  for (const link of state.links.values()) {
    if (link.source === source && link.target === target) return link
  }
  const id = `e${uid()}`
  const link = { id, source, target, type }
  state.links.set(id, link)
  return link
}

export function deleteLink(id) {
  state.links.delete(id)
}

export function getAllLinks() {
  return [...state.links.values()]
}

// ─── Export au format Cytoscape ──────────────────────────────

export function getElements() {
  const nodes = [...state.persons.values()].map(p => {
    const name  = `${p.firstname} ${p.lastname}`.trim()
const birth = p.birth ? `${p.birth}` : ''
const death = p.death ? `${p.death}` : ''
const dates = [birth, death].filter(Boolean).join(' - ')
const displayLabel = dates ? `${name}\n${dates}` : name

    return {
      data: {
        id: p.id,
        label:        displayLabel,
        displayLabel: displayLabel,
        firstname:    p.firstname,
        lastname:     p.lastname,
        birth:        p.birth,
        death:        p.death,
        isSpouse:     p.isSpouse,
      }
    }
  })

  const edges = [...state.links.values()].map(l => ({
    data: {
      id:     l.id,
      source: l.source,
      target: l.target,
      type:   l.type,
    }
  }))

  return [...nodes, ...edges]
}

// ─── Personne de départ (racine) ─────────────────────────────

export function initRoot() {
  const root = addPerson({ firstname: 'Ancêtre', lastname: '', birth: '', death: '' })
  return root
}

// ─── Sauvegarde / Chargement ──────────────────────────────────

export function exportData() {
  return {
    persons: [...state.persons.values()],
    links:   [...state.links.values()],
  }
}

export function importData(data) {
  state.persons.clear()
  state.links.clear()

  data.persons.forEach(p => state.persons.set(p.id, p))
  data.links.forEach(l => state.links.set(l.id, l))
}