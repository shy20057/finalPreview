/**
 * Storage layer: HTTP API client (Node.js + SQLite backend)
 * Previously used IndexedDB; now forwards to backend REST API.
 */

import {
  loadBanks,
  addBank,
  deleteBank,
  updateBank,
  getBank,
  bankExists,
  loadHistory,
  addHistoryRecord,
  deleteHistoryRecord,
  clearHistory,
  getNote,
  saveNote,
  deleteNote,
  loadNotesByBank,
  exportAll,
  importAll,
  loadFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
  getAllSessions,
  getSessionsWithBankInfo,
  getSession,
  upsertHistorySession,
  saveSession,
  deleteSession,
} from './api.js'

// Compatibility shim for old callers that passed an array
async function saveBanks(banks) {
  if (!Array.isArray(banks)) return
  const existing = await loadBanks()
  // Delete all existing
  for (const b of existing) {
    await deleteBank(b.id)
  }
  // Re-add
  for (const b of banks) {
    await addBank(b)
  }
}

export {
  loadBanks,
  saveBanks,
  addBank,
  deleteBank,
  updateBank,
  getBank,
  bankExists,
  loadHistory,
  addHistoryRecord,
  deleteHistoryRecord,
  clearHistory,
  getNote,
  saveNote,
  deleteNote,
  loadNotesByBank,
  exportAll,
  importAll,
  loadFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
  getAllSessions,
  getSessionsWithBankInfo,
  getSession,
  upsertHistorySession,
  saveSession,
  deleteSession,
}
