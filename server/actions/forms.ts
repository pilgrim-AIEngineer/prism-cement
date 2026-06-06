// Admin-only form template CRUD (createFormTemplateVersion, archiveFormTemplate, ...).
// Editing never mutates an existing version — always insert version = max(version) + 1 — see [[dynamic-form]].
export {};
