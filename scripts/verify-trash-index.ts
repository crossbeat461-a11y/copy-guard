import assert from "node:assert/strict";
import { parseTrashIndex, serializeTrashIndex } from "../src/trashIndexParse";

assert.equal(parseTrashIndex(null).size, 0);
assert.equal(parseTrashIndex("nope").size, 0);
assert.equal(parseTrashIndex({ version: 1 }).size, 0);
assert.equal(parseTrashIndex({ files: [] }).size, 0);

const parsed = parseTrashIndex({
	version: 1,
	files: {
		"K-Tech Trash Box/Note.md": "folder/Note.md",
		skipEmpty: "",
		skipNumber: 1,
	},
});
assert.equal(parsed.size, 1);
assert.equal(parsed.get("K-Tech Trash Box/Note.md"), "folder/Note.md");

const roundTrip = parseTrashIndex(JSON.parse(serializeTrashIndex(parsed)));
assert.equal(roundTrip.get("K-Tech Trash Box/Note.md"), "folder/Note.md");

console.log("trash-index: ok");
