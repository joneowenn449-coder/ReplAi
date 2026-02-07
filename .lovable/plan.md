
# Fix: sending the wrong (initial) draft version after regeneration

## Problem

After regenerating a reply multiple times and clicking "Send", the system sends the initial version instead of the latest one. Two bugs cause this:

1. **`handleSend` does not pass text explicitly.** When not in edit mode, it sends `undefined` to the backend, which then reads `ai_draft` from the database. If a race condition occurs between multiple regeneration calls, the DB may have a stale version.

2. **`editedText` state never syncs with new drafts.** It is initialized once via `useState(aiDraft || "")` and never updates when `aiDraft` changes from regeneration. If the user ever toggled edit mode, the stale value would be sent.

## Solution

### File: `src/components/ReviewCard.tsx`

**A. Always pass the visible text explicitly to send functions:**

Change `handleSend` so it always resolves to the currently displayed text:

```text
BEFORE:
  const textToSend = customText || (editMode ? editedText : undefined);

AFTER:
  const textToSend = customText || (editMode ? editedText : aiDraft) || undefined;
```

This ensures that even without edit mode, the current `aiDraft` prop (which reflects the latest regeneration) is passed to the backend.

**B. Sync `editedText` when `aiDraft` prop changes:**

Add a `useEffect` to keep `editedText` in sync when the prop updates (from regeneration):

```typescript
useEffect(() => {
  if (!editMode) {
    setEditedText(aiDraft || "");
  }
}, [aiDraft]);
```

**C. Disable "Send" button while regeneration is in progress:**

Prevent the user from clicking "Send" while a new draft is being generated:

```text
disabled={sendReply.isPending || generateReply.isPending}
```

This applies to both the draft section "Send" button and the sent-answer-edit "Send" button.

### No backend changes needed

The `send-reply` edge function already handles receiving explicit `answer_text` correctly. The fix is entirely on the frontend.

## Affected file

| File | Change |
|------|--------|
| `src/components/ReviewCard.tsx` | Fix `handleSend` to always pass visible text; sync `editedText` with prop; disable Send during regeneration |

## Result

- The text visible on screen at the moment of clicking "Send" is exactly what gets sent to Wildberries
- No more race conditions between regeneration and sending
- Editing state stays in sync with the latest generated draft
