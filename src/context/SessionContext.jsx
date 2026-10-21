import { createContext, useContext } from 'react'

const SessionContext = createContext(null)

export function SessionProvider({ value, children }) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// Used by any page nested under a SessionWorkspace route. Returns the loaded
// session (or null while loading), its id, and whether the current user can
// act as a coordinator on THIS session specifically (created it, or holds
// FULL access as a marker) - not the user's global account role, since a
// LECTURER account is not automatically the coordinator of every session
// they can see.
export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be called within a SessionWorkspace route')
  return ctx
}

// For shared components (like Topbar) that render both inside and outside a
// session, and only need to know which one they are in.
export function useOptionalSession() {
  return useContext(SessionContext)
}
