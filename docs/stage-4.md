# Stage 4: removed

The former built-in night mode was removed on 2026-11-03 to simplify the card. Scheduling, entity control, persisted mode, night visibility and separate night colors are no longer supported.

Configure each card with one `appearance.preset` (`dark` or `light`), optional `appearance.colors`, and the usual enabled sections. For a different evening presentation, create a second dashboard and let Home Assistant control switching. Give each card a unique `instance_id` for independent Done/Undo state.

Existing day appearance is carried over to `appearance.preset`; a former `night` preset falls back to `dark`. Day color overrides, enabled flags and source selections remain. Removed settings are discarded during normalization and are omitted from visual-editor/YAML output. No live Home Assistant dashboards or automations are changed by this removal.

See the [configuration reference](configuration.md) and [installation guide](installation.md).
