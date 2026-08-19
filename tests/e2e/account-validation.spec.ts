import { expect, test } from "@playwright/test";

import {
  isValidAddressId,
  readAddressFields,
  readProfileFields,
  validateAddressFields,
  validateProfileFields,
} from "../../src/lib/account/validation";

test("profilul acceptă numai câmpurile editabile și validează limitele", () => {
  const formData = new FormData();
  formData.set("firstName", "A".repeat(101));
  formData.set("lastName", "Popescu");
  formData.set("phone", "1".repeat(31));
  formData.set("id", "nu-trebuie-folosit");
  formData.set("role", "admin");

  const fields = readProfileFields(formData);
  const errors = validateProfileFields(fields);

  expect(fields).toEqual({
    firstName: "A".repeat(101),
    lastName: "Popescu",
    phone: "1".repeat(31),
  });
  expect(errors.firstName).toBeTruthy();
  expect(errors.phone).toBeTruthy();
  expect("id" in fields).toBe(false);
  expect("role" in fields).toBe(false);
});

test("adresa validează câmpurile obligatorii și normalizează codul țării", () => {
  const formData = new FormData();
  formData.set("countryCode", "ro");
  formData.set("user_id", "identitate-controlată-de-client");

  const fields = readAddressFields(formData);
  const errors = validateAddressFields(fields);

  expect(fields.countryCode).toBe("RO");
  expect(errors.recipientName).toBeTruthy();
  expect(errors.phone).toBeTruthy();
  expect(errors.addressLine1).toBeTruthy();
  expect(errors.city).toBeTruthy();
  expect(errors.county).toBeTruthy();
  expect("user_id" in fields).toBe(false);
});

test("identificatorul adresei trebuie să fie UUID", () => {
  expect(isValidAddressId("9b3deb64-bc54-43d9-95b4-aabbccddeeff")).toBe(true);
  expect(isValidAddressId("../alta-adresa")).toBe(false);
});
