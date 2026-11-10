// მომწოდებლები (the nursery): rs.ge invoices vs ORIS per supplier (v_supplier_recon). W-DEBT retires it into ვალები.
import { t, esc, num, gel, card, stat } from "../ui.js?v=16459b0.202611101234";

export default function view(d) {
  const rank = (x) => !Number(x.rsge_invoiced) ? 1 : Math.abs(x.gap_invoiced_vs_booked) >= 1 ? 0 : 2;
  const R = (d.recon || []).slice().sort((a, b) => rank(a) - rank(b) || Math.abs(b.gap_invoiced_vs_booked) - Math.abs(a.gap_invoiced_vs_booked) || Number(b.oris_booked) - Number(a.oris_booked));
  const off = R.filter((x) => Math.abs(x.gap_invoiced_vs_booked) >= 1 && Number(x.rsge_invoiced) > 0);
  let s = `<div class="grid2">${stat(t("recon.suppliers"), R.length, t("recon.suppliers_sub"))}${stat(t("recon.off"), off.length, t("recon.off_sub"))}</div>`;
  s += card(t("recon.title"), "", R.map((x, i) => {
    const g = Number(x.gap_invoiced_vs_booked); const noInv = !Number(x.rsge_invoiced);
    const pill = noInv ? `<span class="pill p-grey">${t("recon.no_invoice")}</span>` : Math.abs(g) < 1 ? `<span class="pill p-ok">${t("recon.match")}</span>` : `<span class="pill p-bad">${g > 0 ? "+" : ""}${num(g)} ₾</span>`;
    return `<div class="row tap" data-det="${i}"><div class="row-m"><div class="row-t">${esc(x.supplier)}</div><div class="row-c">ORIS ${gel(x.oris_booked)} · rs.ge ${gel(x.rsge_invoiced)}</div></div>${pill}<span class="chev">›</span></div>`
      + `<div class="det" id="det${i}"><div><span>${t("recon.d_invoices")}</span><b>${gel(x.rsge_invoiced, 2)} (${x.invoices})</b></div><div><span>${t("recon.d_waybills")}</span><b>${gel(x.rsge_waybills, 2)} (${x.waybills})</b></div><div><span>${t("recon.d_booked")}</span><b>${gel(x.oris_booked, 2)}</b></div><div><span>${t("recon.d_oris_paid")}</span><b>${gel(x.oris_paid, 2)}</b></div><div><span>${t("recon.d_bank_paid")}</span><b>${gel(x.bank_paid, 2)}</b></div><div><span>${t("recon.d_tin")}</span><b>${esc(x.tin)}</b></div></div>`;
  }).join(""));
  s += `<div class="note">${t("recon.note")}</div>`;
  return s;
}
