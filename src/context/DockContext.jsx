import { createContext, useContext } from 'react'

// Lets a chat panel on a session page tell the session layout how wide it
// is, so the page moves over to make room instead of being covered.
export const DockContext = createContext(null)
export const useDock = () => useContext(DockContext)
