# Security Specification - ObraControl

This specification defines the security invariants and validation guidelines for the Firestore database of ObraControl.

## 1. Data Invariants

1. **User Profiles (`/usuarios/{userId}`)**: 
   - A user profile can only be read, created, updated, or deleted by the owner (where `userId == request.auth.uid`).
   - The user ID in the document must match the authenticated user UID.

2. **Projects (`/obras/{obraId}`)**:
   - A construction project must belong to an authenticated user (`usuarioId == request.auth.uid`).
   - Only the project owner can read, update, or delete the project.
   - Project balance tracks the capital status.

3. **Sub-resources (`entradas`, `saidas`, `maoObra`, `materiais`)**:
   - These sub-resources must relate to a valid project via `obraId`.
   - To read, write, or delete any sub-resource, the authenticated user must be the owner of the parent project. This is verified by fetching the parent project document.

4. **Price Comparisons (`comparacaoPrecos`)**:
   - Users can compare prices across different stores.
   - Each comparison record is scoped to the user (`usuarioId == request.auth.uid`).

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads represent unauthorized or invalid operations that the Firestore rules must block.

1. **Identity Spoofing - User Profile** (Writing a user profile with a different UID):
   - Path: `/usuarios/attacker_uid`
   - Payload: `{"id": "victim_uid", "nome": "Attacker", "email": "victim@example.com"}`
   - Expected: `PERMISSION_DENIED`

2. **Project Hijacking** (Creating a project with another user's `usuarioId`):
   - Path: `/obras/project_123`
   - Payload: `{"id": "project_123", "usuarioId": "victim_uid", "nome": "My Project", "saldoInicial": 1000}`
   - Expected: `PERMISSION_DENIED`

3. **Cross-User Project Access** (Reading another user's project details):
   - Path: `/obras/victim_project_id`
   - Action: `get` by attacker
   - Expected: `PERMISSION_DENIED`

4. **Orphaned Material Purchase** (Creating a material purchase with a non-existent or invalid `obraId` ID):
   - Path: `/materiais/material_123`
   - Payload: `{"id": "material_123", "obraId": "non_existent_project_id", "nome": "Cimento", "quantidade": 10}`
   - Expected: `PERMISSION_DENIED`

5. **Cross-User Material Access** (Reading a material document belonging to another user's project):
   - Path: `/materiais/victim_material_id`
   - Action: `get` by attacker
   - Expected: `PERMISSION_DENIED`

6. **Invalid Types - Material Purchase** (Injecting invalid quantity type):
   - Path: `/materiais/material_abc`
   - Payload: `{"id": "material_abc", "obraId": "attacker_project_id", "nome": "Areia", "quantidade": "many"}` (String instead of Number)
   - Expected: `PERMISSION_DENIED`

7. **Negative Values - Material Purchase** (Injecting negative prices):
   - Path: `/materiais/material_xyz`
   - Payload: `{"id": "material_xyz", "obraId": "attacker_project_id", "nome": "Tinta", "quantidade": 10, "valorUnitario": -5.50}`
   - Expected: `PERMISSION_DENIED`

8. **Unsigned Write - Sub-resource** (Writing without authentication):
   - Path: `/entradas/entrada_789`
   - Payload: `{"id": "entrada_789", "obraId": "project_123", "valor": 5000}` (Request has no auth token)
   - Expected: `PERMISSION_DENIED`

9. **Resource Poisoning - Huge String** (Injecting a 1MB string into an ID or name field):
   - Path: `/obras/project_huge`
   - Payload: `{"id": "project_huge", "usuarioId": "attacker_uid", "nome": "A...[1MB string]...A"}`
   - Expected: `PERMISSION_DENIED`

10. **State Shortcutting - Modifying Immutables** (Updating `usuarioId` of a project after creation):
    - Path: `/obras/project_123`
    - Action: `update` with `{"usuarioId": "new_attacker_uid"}`
    - Expected: `PERMISSION_DENIED`

11. **Malicious Price Comparison** (Creating a comparison record for another user):
    - Path: `/comparacaoPrecos/comp_123`
    - Payload: `{"id": "comp_123", "usuarioId": "victim_uid", "material": "Tijolo", "valor": 1.20}`
    - Expected: `PERMISSION_DENIED`

12. **PII Leakage** (Blanket listing other users' personal info):
    - Path: `/usuarios`
    - Action: `list` query without filtering by `request.auth.uid`
    - Expected: `PERMISSION_DENIED`
