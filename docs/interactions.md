# Interactions

Optional overlay (toolbar → *Interactions*). When a perpetrator is shown on the chart, the victim gets a second, dashed line. Factors are editable under *Interaction factors*.

- **Typical**: usual effect size.
- **Worst case**: all active perpetrators at peak effect *at the same time*, each at its largest sourced effect, multiplied together. An upper bound, not a prediction. Inducers are left out (they lower levels).
- Static model: the effect is assumed constant while the perpetrator is present. Formulas: *Formulas* §7. Time-dependent enzyme changes (induction building up over days, fading after stopping) are not modelled — see *Limits → Revisit later* for the data situation.

| Perpetrator → victim | Mechanism | Typical / worst | Evidence | Source |
|---|---|---|---|---|
| Estradiol → agomelatine | estrogens are moderate CYP1A2 inhibitors; "several-fold" exposure increase | F × 3 / × 5 ≈ (label gives no number) | label | [Agomelatine SmPC §4.5](https://www.medicines.org.uk/emc/product/6564/smpc) |
| Estradiol → caffeine | CYP1A2 inhibition; caffeine metabolic ratio −29% on estradiol HRT | ke × 0.71 / × 0.5 ≈ | clinical, n = 12 | [Pollock 1999](https://doi.org/10.1177/00912709922008560) |
| CBD → caffeine | weak CYP1A2 inhibition; caffeine AUC +95% at CBD 750 mg twice daily | ke ÷ 1.1 ≈ (low doses) / ÷ 1.95 | clinical | [cannabidiol SmPC §4.5](https://www.medicines.org.uk/emc/product/10781/smpc) |
| CBD → bupropion | CYP2B6 inhibition predicted in vitro | note only | in vitro | [cannabidiol SmPC §4.5](https://www.medicines.org.uk/emc/product/10781/smpc) |
| CBD → estradiol, progesterone | CYP3A4 inhibition in vitro, but CBD did **not** change midazolam (CYP3A4) in vivo | note only, likely minor | in vitro | [cannabidiol SmPC §4.5](https://www.medicines.org.uk/emc/product/10781/smpc) |
| Smoking → caffeine, agomelatine | combustion products induce CYP1A2: theophylline clearance +42% in cannabis *or* tobacco smokers | note only: **vaporizing avoids combustion**, not applied | clinical | [Jusko 1978](https://pubmed.ncbi.nlm.nih.gov/688731/), [Agomelatine SmPC §4.5](https://www.medicines.org.uk/emc/product/6564/smpc) |
| Smoking → oral estradiol | faster hepatic estrogen metabolism; ~50% lower E2/E1 in tobacco smokers on HRT | note only | clinical | [Jensen 1985](https://doi.org/10.1056/NEJM198510173131602) |
| Bupropion → CYP2D6 substrates | strong CYP2D6 inhibitor; none of the presets depend mainly on CYP2D6 | not shown | label | [Bupropion XL label](https://www.accessdata.fda.gov/drugsatfda_docs/label/2003/21515_wellbutrin_lbl.pdf) |

Not covered: pharmacodynamic interactions (e.g. sedation adding up, seizure threshold with bupropion), alcohol, and anything not listed. Ask a pharmacist for real decisions.
