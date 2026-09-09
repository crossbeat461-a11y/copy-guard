import assert from "node:assert/strict";
import {
	stripOfficialSyncHyphenConflict,
	stripProtonDriveSuffixes,
} from "../src/conflict-names";

assert.equal(
	stripProtonDriveSuffixes(
		"test file (# Edit conflict 2025-08-17 lid3dpC #) (# Name clash 2025-08-17 69e4p8C #)"
	),
	"test file"
);
assert.equal(
	stripProtonDriveSuffixes("Meeting notes (# Edit conflict 2025-08-17 abc123 #)"),
	"Meeting notes"
);
assert.equal(stripProtonDriveSuffixes("plain note"), null);

assert.equal(stripOfficialSyncHyphenConflict("Note-conflict-2026-08-31"), "Note");
assert.equal(
	stripOfficialSyncHyphenConflict("Meeting notes-conflict-2026-08-31-123456"),
	"Meeting notes"
);
assert.equal(stripOfficialSyncHyphenConflict("Note_conflict-20260831"), null);
assert.equal(stripOfficialSyncHyphenConflict("plain-note"), null);

console.log("conflict-names: ok");
