import { InlineKeyboard } from "grammy";
import type { WordBase } from "../services/word-base.js";

export const kbBases = (bases: WordBase[]) => {
  const kb = new InlineKeyboard();
  bases.forEach((b) => kb.text(b.name, `open_base:${b.id}`).row());
  return kb.text("Create base", "create_base");
};

export const kbBase = (id: number) =>
  new InlineKeyboard()
    .text("Add word", `add_word:${id}`)
    .row()
    .text("Rename base", `rename_base:${id}`)
    .row()
    .text("Delete base", `delete_base:${id}`)
    .row()
    .text("Exercise", `exercise:${id}`)
    .row()
    .text("Back", "back_to_bases");
