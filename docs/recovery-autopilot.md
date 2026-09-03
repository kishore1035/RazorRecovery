# Recovery Autopilot

Autopilot evaluates whether human intervention is required before contacting a customer.

## Logic
When `automaticRecoveryEnabled = true` AND the Policy Engine evaluates the AI's selected recovery strategy as `allowed`, the case progresses automatically to `RECOVERING`. 
If `automaticRecoveryEnabled = false` or a threshold triggers `approvalRequired = true`, the system pauses the case in `AWAITING_APPROVAL` and waits for merchant authorization.

## Approvals
The `ApprovalRequest` record acts as the holding mechanism. When a merchant (Admin/Owner) approves, the system generates the Recovery Plan based on the snapshot of the AI decision that was just approved, proceeding seamlessly into `RECOVERING`.
