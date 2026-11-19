import type { CustomField, MenuItem } from "@dawry/shared";
import type { CustomFieldRow, MenuItemRow } from "./repo";

export const toMenuItem = (r: MenuItemRow): MenuItem => ({
  id: r.id,
  name: r.name,
  active: r.active,
});

export const toField = (r: CustomFieldRow): CustomField => ({
  id: r.id,
  label: r.label,
  required: r.required,
  public: r.public,
  active: r.active,
});
