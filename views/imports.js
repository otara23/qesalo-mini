// იმპორტი (the main company; the bot's card M6): the current year's customs declarations.
import { t, tOr, esc, num, gel, dt, card, row, stat } from "../ui.js?v=9d4cb1c.202611092057";

export default function view(d) {
  const R = d.registers || [], last = R.map((r) => r.last_reg_date).sort().pop();
  let s = `<div class="card hero"><div class="hero-l">${t("imports.value", { y: esc(d.year) })}</div><div class="hero-v">${gel(d.value_gel)}</div><div class="hero-s">${t("imports.as_of", { d: dt(d.as_of) })}</div></div>`;
  s += `<div class="grid2">${stat(t("imports.declarations"), num(d.declarations), last ? t("imports.last", { d: dt(last) }) : "")}${stat(t("imports.vat_duty"), gel(d.vat_duty), t("imports.at_customs"))}</div>`;
  s += card(t("imports.list"), "", R.length ? R.map((r) => row(esc(tOr("imports.reg." + r.register, r.register)), t("imports.reg_row", { n: num(r.declarations), d: dt(r.last_reg_date) }), gel(r.value_gel))).join("")
    : `<div class="empty">${t("imports.none")}</div>`);
  return s + card(t("imports.taxes"), "", row(t("imports.import_vat"), "", gel(d.import_vat)) + row(t("imports.duty"), "", gel(d.import_duty)) + (Number(d.excise) ? row(t("imports.excise"), "", gel(d.excise)) : ""));
}
