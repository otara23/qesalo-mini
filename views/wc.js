// საბრუნავი (the nursery): six rows of v_v5_working_capital. W-DRILL adds the drill-downs (plans/bot-v3.md §3.5).
import { t, num, gel, dt, card, row } from "../ui.js?v=e8f5cf1.202611091511";

export default function view(d) {
  const w = d.wc || {};
  return card(t("wc.title"), t("wc.books_on", { d: dt(w.books_as_of) }),
    row(t("wc.saplings"), "", gel(w.stock_saplings))
    + row(t("wc.wip"), "", gel(w.work_in_progress))
    + row(t("wc.stock_other"), "", gel(w.stock_other))
    + row(t("wc.receivables"), "", gel(w.receivables_and_advances))
    + row(t("wc.payables"), "", `<span class="neg">−${num(w.payables_third_party)} ₾</span>`)
    + row(t("wc.vat_credit"), "", gel(w.vat_credit_card)));
}
