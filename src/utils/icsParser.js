import ICAL from 'ical.js'

export async function fetchAndParseCalendar(userGroup) {
  try {
    const response = await fetch('/planning.ics')
    const text = await response.text()

    const jcalData = ICAL.parse(text)
    const vcalendar = new ICAL.Component(jcalData)
    const vevents = vcalendar.getAllSubcomponents('vevent')

    // 1. Définition des cibles (Comme avant)
    let targetGroups = [userGroup]
    if (['TP1', 'TP2'].includes(userGroup)) targetGroups.push('TDA')
    else if (['TP3', 'TP4'].includes(userGroup)) targetGroups.push('TDB')
    targetGroups.push('1A', 'Cours', 'Amphi')

    const events = vevents.map(event => {
      const summary = event.getFirstPropertyValue('summary') || "Cours sans titre"
      const description = event.getFirstPropertyValue('description') || ""
      const location = event.getFirstPropertyValue('location') || ""
      const startDate = event.getFirstPropertyValue('dtstart').toJSDate()
      const endDate = event.getFirstPropertyValue('dtend').toJSDate()

      // --- LOGIQUE INTELLIGENTE D'EXTRACTION ---
      
      // 1. Trouver le Prof
      // On découpe la description ligne par ligne
      const lines = description.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      
      // On cherche une ligne qui ressemble à un nom (pas un chiffre, pas "TPx", pas une date)
      let prof = lines.find(l => 
        !l.includes('TP') && 
        !l.includes('TD') && 
        !l.match(/^\d+$/) && // Pas un timestamp
        !l.includes('Modifié') &&
        l.length > 3 // Pas juste "1A"
      ) || ""

      // 2. Analyser si c'est une SAÉ / Autonomie
      const isSAE = summary.includes('SAÉ')
      // Si c'est une SAÉ et qu'il n'y a PAS de salle, c'est souvent "Non encadré"
      let finalLocation = location
      let isAutonomie = false

      if (isSAE && !location) {
        finalLocation = "Non encadré (Autonomie)"
        isAutonomie = true
      } else if (!location) {
        finalLocation = "Salle inconnue"
      }

      return {
        title: summary,
        description: description,
        prof: prof,
        location: finalLocation,
        start: startDate,
        end: endDate,
        isAutonomie: isAutonomie,
        type: summary.split(':')[0] // Ex: "R101" ou "SAÉ105" pour afficher un petit tag
      }
    })

    // --- FILTRAGE ---
    const myEvents = events.filter(ev => {
        const contentToCheck = (ev.title + " " + ev.description).toUpperCase()
        return targetGroups.some(group => contentToCheck.includes(group.toUpperCase()))
    })

    return myEvents.sort((a, b) => a.start - b.start)

  } catch (error) {
    console.error("Erreur parser:", error)
    return []
  }
}