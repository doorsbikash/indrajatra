import { describe, expect, it } from "vitest";
import { outstandingItems, type Volunteer } from "./volunteers";

const volunteer: Volunteer = {
  id: 1, reference: "test", firstName: "Sam", lastName: "Tester", email: "sam@example.com",
  phone: "0400000000", assistanceArea: "General support", status: "checked_in",
  sashIssued: true, badgeIssued: true, radioIssued: true, otherItems: "Keys",
  sashReturned: false, badgeReturned: false, radioReturned: false, otherItemsReturned: false,
  approvedAt: null, checkedInAt: null, signedOffAt: null, createdAt: "", updatedAt: ""
};

describe("outstandingItems", () => {
  it("lists every issued item that has not been returned", () => {
    expect(outstandingItems(volunteer)).toEqual(["Sash", "Badge", "Walkie-talkie", "Keys"]);
  });

  it("does not list returned or unissued items", () => {
    expect(outstandingItems({ ...volunteer, sashReturned: true, badgeIssued: false, radioReturned: true, otherItemsReturned: true })).toEqual([]);
  });
});
