# Changelog

All notable updates to LeadBoard are recorded here, newest first.

## V1.0.1 — 2026-09-17

Permissions & visibility overhaul.

- Visibility: replaced the binary Shared/Private toggle with a 3-mode control
  **Normal / Private / Shared** (in both the task detail panel and the
  "Create new task" form). The active mode lights up green; the others are grey.
  - **Normal** (default): follows role & project rules; moderators can access
    Normal items to process them.
  - **Private**: only the owner, the assignee, and added viewers can see it.
    Enabling Private greys out Normal/Shared.
  - **Shared**: visible to everyone. Enabling Shared greys out Private.
  - `visibility` is now the source of truth; the legacy `is_shared` flag is kept
    in sync (`is_shared = visibility == "shared"`).
- Permissions:
  - Moderators & users now have **delete_own** — they can delete only the items
    they created.
  - Moderators can **no longer delete** items created by others in any module.
  - Setting a mode: admins can set any mode; owners can set any mode (incl.
    Private) on their own items; moderators can set only Normal/Shared.
  - **Admin** retains supreme access to everything (including Private items).
- Backend: added `visibility` column (migration `0023_visibility_modes`) to
  owned tables, with `can_view` / `can_set_visibility` / `can_delete` enforcement
  on task update & delete endpoints.

## V1.0.0 — 2026-09-17

Initial tracked release.

- Tasks: assignee picker, viewers/watchers, shared/private visibility toggle
  (available in both the task detail panel and the "Create new task" form).
- Tasks: user search/combobox is diacritic-insensitive (Vietnamese names can
  be searched without accents).
- Tasks: full English UI conversion (labels, statuses, priorities, messages).
- Tasks: critical/overdue/due-soon highlighting fixed and restored on both
  grid (card) and list (row) views, with a stronger highlight color.
- Tasks: task detail panel now shows who created the task ("Created by").
- App: version number shown in the sidebar; clicking it (admin account only)
  opens this changelog.
