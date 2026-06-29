# Settlement orchestrator (Path A)

Off-chain rupiah is paid (BRI / BRILink). This service verifies the payment
confirmation, then calls the contract `settle()` to record settlement on-chain.

Chain is the tamper-proof RECORD, not the payment processor. Never claim
"autonomous settlement" (see CLAUDE.md golden rule 3, ARCHITECTURE.md section 5).

MVP status: demo uses on-chain dIDR directly from the coop UI. Path A wired post-MVP.
