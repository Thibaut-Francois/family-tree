// ─── Store : source de vérité de l'arbre généalogique ────────

// Structure interne
const state = {
  persons: new Map(), // id → { id, firstname, lastname, birth, death }
  links:   new Map(), // id → { id, parentId, childId }
}

// ─── Utilitaires ─────────────────────────────────────────────

function uid() {
  return `_${Math.random().toString(36).slice(2, 9)}`
}

// ─── Personnes ───────────────────────────────────────────────

export function addPerson({ firstname, lastname = '', birth = '', death = '' }) {
  const id = `p${uid()}`
  const person = { id, firstname, lastname, birth, death }
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
  // Supprime aussi tous les liens qui impliquent cette personne
  for (const [lid, link] of state.links) {
    if (link.parentId === id || link.childId === id) {
      state.links.delete(lid)
    }
  }
}

export function getPerson(id) {
  return state.persons.get(id) ?? null
}

// ─── Liens ───────────────────────────────────────────────────

export function addLink(parentId, childId) {
  // Évite les doublons
  for (const link of state.links.values()) {
    if (link.parentId === parentId && link.childId === childId) return link
  }
  const id = `e${uid()}`
  const link = { id, parentId, childId }
  state.links.set(id, link)
  return link
}

export function deleteLink(id) {
  state.links.delete(id)
}

// ─── Export au format Cytoscape ──────────────────────────────

export function getElements() {
  const nodes = [...state.persons.values()].map(p => ({
    data: {
      id: p.id,
      label: `${p.firstname} ${p.lastname}`.trim(),
      firstname: p.firstname,
      lastname:  p.lastname,
      birth:     p.birth,
      death:     p.death,
    }
  }))

  const edges = [...state.links.values()].map(l => ({
    data: {
      id:     l.id,
      source: l.parentId,
      target: l.childId,
    }
  }))

  return [...nodes, ...edges]
}

// ─── Données de test (à supprimer plus tard) ─────────────────

export function loadTestData() {
  const marie  = addPerson({ firstname: 'Marie',  lastname: 'Dupont', birth: '1920', death: '1998' })
  const jean   = addPerson({ firstname: 'Jean',   lastname: 'Dupont', birth: '1918', death: '2001' })
  const pierre = addPerson({ firstname: 'Pierre', lastname: 'Dupont', birth: '1945' })
  const anne   = addPerson({ firstname: 'Anne',   lastname: 'Dupont', birth: '1948' })

  addLink(marie.id,  pierre.id)
  addLink(marie.id,  anne.id)
  addLink(jean.id,   pierre.id)
  addLink(jean.id,   anne.id)
}