# Photography First — verified release

Based on latest main cc3f6a56830eb71d568c516e1775652c6a228b3f; branch `codex/photography-first`.

## Collection and storage

137 → 202 photographs: **65 added**, all car-only records with full provenance. 64 new photos have real 2560px derivatives; 153 photos in the complete inventory have 1600px derivatives. One 1206px source remains 1206px. No upscaling or original downloads are published.

| Model | Before | Added | Total |
|---|---:|---:|---:|
| Vantage AMR GT3 EVO（2024） | 6 | 4 | 10 |
| Vantage AMR GT3（2019车身／澳洲Trophy） | 3 | 1 | 4 |
| R8 LMS GT3 EVO II | 3 | 13 | 16 |
| M4 GT3 EVO | 25 | 0 | 25 |
| Corvette Z06 GT3.R | 3 | 15 | 18 |
| 296 GT3 | 7 | 0 | 7 |
| 296 GT3 Evo | 17 | 0 | 17 |
| Mustang GT3（2026 EVO升级包） | 10 | 0 | 10 |
| Huracán GT3 EVO2 | 6 | 0 | 6 |
| Temerario GT3 | 16 | 0 | 16 |
| RC F GT3 | 3 | 12 | 15 |
| 720S GT3 EVO | 11 | 0 | 11 |
| GT3 EVO（2020） | 3 | 10 | 13 |
| GT-R NISMO GT3（2018规格） | 3 | 3 | 6 |
| 911 GT3 R（992，2026 EVO） | 18 | 0 | 18 |
| 911 GT3 R（991.2／按悉尼官方标注） | 3 | 7 | 10 |

Final offline-inclusive Pages directory: 100,088,023 bytes (95.45 MiB), +51.23 MiB from the 44.22 MiB baseline. Image resources: 578, 84.65 MiB. No derivative exceeds 1.5 MiB. Project soft budgets are 300 MiB warning and 600 MiB manual review, not GitHub official limits.

| Actual width | Resources | MiB |
|---|---:|---:|
| 320px | 89 | 1.24 |
| 480px | 65 | 1.83 |
| 500px | 5 | 0.30 |
| 600px | 1 | 0.11 |
| 800px | 89 | 6.11 |
| 960px | 65 | 5.61 |
| 1000px | 42 | 4.37 |
| 1206px | 1 | 0.19 |
| 1600px | 153 | 34.02 |
| 2560px | 64 | 30.35 |

## Verification

- `python3 scripts/build.py` and `--offline`: passed.
- Python unittest: 22/22. Static checks: 131/131.
- Real Chrome navigation: 62/62. Photography: 103/103, including original zoom/pan/touch/keyboard/focus regressions and new HD/URL/failure checks.
- Evidence validator: 16 required PNGs, all checks, 23 measurements, exact storage report. Extra HD-failure screenshot is retained.
- All derivatives decoded at recorded dimensions with bounded concurrency; SHA-256 integrity verified. Perceptual hashes reject Hamming distance ≤6 against all 137 baseline photographs and other new photos. Visual near-duplicates were excluded separately.
- Local cold-navigation observations: about 0.93 MiB desktop and 0.50 MiB DPR2 mobile before user scrolling; zero 2560px requests. Exact resources/timings are in measurements.json, not a Lighthouse score or universal network guarantee.

## Rights review checklist

65 imported sources: 48 CC BY-SA 4.0, 16 CC BY 4.0, 1 CC0. Each passes explicit license/author/source revision/original SHA-1 and model review. Resized WebP derivatives retain the full frame. CC BY-SA derivatives retain their applicable license. Author and license links appear beside displayed photographs and in the viewer. Original metadata and attribution are preserved in the committed source ledger.

The previous 48 source-reference photos remain unconfirmed for republication, exactly as before; this upgrade does not relabel them licensed. Other trademark/personality rights are not granted by CC licenses. Originals remain at their external source links; all required display resources are served by Pages.

Wikimedia supports a defined set of thumbnail sizes. Research cached originals or available standard derivatives, then downsampled locally; no nonstandard remote thumbnail URL is required at runtime. Some rejected candidates were distant, near-identical, misclassified or unavailable. Optional race history is intentionally absent from new records.

| Photo / model | Author | License | Source |
|---|---|---|---|
| pf-118660296 / R8 LMS GT3 EVO II | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1273604534](https://commons.wikimedia.org/wiki/File:ADAC_GT_Masters_2022_Spielberg_Nr._15.jpg) |
| pf-118660309 / R8 LMS GT3 EVO II | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1273589587](https://commons.wikimedia.org/wiki/File:ADAC_GT_Masters_2022_Spielberg_Nr._27.jpg) |
| pf-118660311 / R8 LMS GT3 EVO II | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1273604592](https://commons.wikimedia.org/wiki/File:ADAC_GT_Masters_2022_Spielberg_Nr._29.jpg) |
| pf-118660318 / R8 LMS GT3 EVO II | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1273589033](https://commons.wikimedia.org/wiki/File:ADAC_GT_Masters_2022_Spielberg_Nr._33_(1).jpg) |
| pf-118660346 / R8 LMS GT3 EVO II | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1273593405](https://commons.wikimedia.org/wiki/File:ADAC_GT_Masters_2022_Spielberg_Nr._54.jpg) |
| pf-118660368 / R8 LMS GT3 EVO II | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1273589042](https://commons.wikimedia.org/wiki/File:ADAC_GT_Masters_2022_Spielberg_Nr._69.jpg) |
| pf-135605458 / R8 LMS GT3 EVO II | [ACBE25](https://commons.wikimedia.org/w/index.php?title=User:ACBE25&amp;action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1273583361](https://commons.wikimedia.org/wiki/File:AUDIWRT30SPA242022.jpg) |
| pf-145435187 / R8 LMS GT3 EVO II | [ACBE25](https://commons.wikimedia.org/w/index.php?title=User:ACBE25&amp;action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1273583243](https://commons.wikimedia.org/wiki/File:AUDIR8LMSGT3COMTOYOURACING.jpg) |
| pf-152437447 / R8 LMS GT3 EVO II | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1265542024](https://commons.wikimedia.org/wiki/File:GT_World_Challenge_Europe_2024_N%C3%BCrburg_Nr._99_Aka,_Feller,_Haase_(1).jpg) |
| pf-119352690 / R8 LMS GT3 EVO II | [Tokumeigakarinoaoshima](https://commons.wikimedia.org/wiki/User:Tokumeigakarinoaoshima) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1166455003](https://commons.wikimedia.org/wiki/File:No.6_Team_LeMans_Audi_R8_LMS_after_2022_Takanoko_no_Hotel_Suzuka_GT_300km_(3).jpg) |
| pf-120435493 / R8 LMS GT3 EVO II | [Tokumeigakarinoaoshima](https://commons.wikimedia.org/wiki/User:Tokumeigakarinoaoshima) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1166455962](https://commons.wikimedia.org/wiki/File:No.6_Team_LeMans_Audi_R8_LMS_at_2022_Takanoko_no_Hotel_Suzuka_GT_300km_(13).jpg) |
| pf-153728659 / R8 LMS GT3 EVO II | [Steffen Prößdorf](https://commons.wikimedia.org/wiki/User:Stepro) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1273566054](https://commons.wikimedia.org/wiki/File:2023-05-26_Motorsport,_DTM,_Oschersleben_1DX_4294_by_Stepro.jpg) |
| pf-145825048 / R8 LMS GT3 EVO II | [Matti Blume](https://commons.wikimedia.org/wiki/User:MB-one) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1273594626](https://commons.wikimedia.org/wiki/File:Engstler_Motorsport_R8_LMS_GT3_Evo_II,_EMS_23,_Essen_(P1160644).jpg) |
| pf-148710476 / RC F GT3 | [MarcelX42](https://commons.wikimedia.org/w/index.php?title=User:MarcelX42&amp;action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1136641285](https://commons.wikimedia.org/wiki/File:2024_6_Hours_of_Spa-Francorchamps_Akkodis_ASP_Team_Lexus_RC_F_GT3_No.78_(DSC04096).jpg) |
| pf-148745914 / RC F GT3 | [MarcelX42](https://commons.wikimedia.org/w/index.php?title=User:MarcelX42&amp;action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1136641855](https://commons.wikimedia.org/wiki/File:2024_6_Hours_of_Spa-Francorchamps_Akkodis_ASP_Team_Lexus_RC_F_GT3_No.87_(DSC02230).jpg) |
| pf-167693399 / RC F GT3 | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1132125994](https://commons.wikimedia.org/wiki/File:24H_Le_Mans_2025_Nr._78.jpg) |
| pf-168022533 / RC F GT3 | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1171060222](https://commons.wikimedia.org/wiki/File:24H_Le_Mans_2025_Nr._87_(2).jpg) |
| pf-168059868 / RC F GT3 | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1046156604](https://commons.wikimedia.org/wiki/File:24H_Le_Mans_2025_Nr._78_(3).jpg) |
| pf-178603653 / RC F GT3 | [Mickael Le rouzic](https://www.flickr.com/people/199438934@N08) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons revision 1129751581](https://commons.wikimedia.org/wiki/File:2025_24_Hours_of_Le_Mans_(54916437597).jpg) |
| pf-178603901 / RC F GT3 | [Mickael Le rouzic](https://www.flickr.com/people/199438934@N08) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons revision 1222943581](https://commons.wikimedia.org/wiki/File:2025_24_Hours_of_Le_Mans_(54917598940).jpg) |
| pf-178604145 / RC F GT3 | [Mickael Le rouzic](https://www.flickr.com/people/199438934@N08) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons revision 1132121357](https://commons.wikimedia.org/wiki/File:2025_24_Hours_of_Le_Mans_(54917597525).jpg) |
| pf-178605318 / RC F GT3 | [Mickael Le rouzic](https://www.flickr.com/people/199438934@N08) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons revision 1129802461](https://commons.wikimedia.org/wiki/File:2025_24_Hours_of_Le_Mans_(54917593540).jpg) |
| pf-192198949 / RC F GT3 | [MarcelX42](https://commons.wikimedia.org/w/index.php?title=User:MarcelX42&amp;action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1266151381](https://commons.wikimedia.org/wiki/File:2026_6_Hours_of_Spa-Francorchamps_Akkodis_ASP_Team_Lexus_RC_F_LMGT3_No.87_(DSC08183).jpg) |
| pf-193140074 / RC F GT3 | [MarcelX42](https://commons.wikimedia.org/w/index.php?title=User:MarcelX42&amp;action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1252858985](https://commons.wikimedia.org/wiki/File:2026_6_Hours_of_Spa-Francorchamps_Akkodis_ASP_Team_Lexus_RC_F_LMGT3_No.78_(DSC08667).jpg) |
| pf-190079660 / RC F GT3 | [Alexis Doine](https://commons.wikimedia.org/wiki/File:2026_Acura_Grand_Prix_of_Long_Beach_(Lexus_RC_F_GT3).jpg) | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | [Commons revision 1263874902](https://commons.wikimedia.org/wiki/File:2026_Acura_Grand_Prix_of_Long_Beach_(Lexus_RC_F_GT3).jpg) |
| pf-148710477 / Corvette Z06 GT3.R | [MarcelX42](https://commons.wikimedia.org/w/index.php?title=User:MarcelX42&amp;action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1136641308](https://commons.wikimedia.org/wiki/File:2024_6_Hours_of_Spa-Francorchamps_TF_Sport_Chevrolet_Corvette_Z06_GT3.R_No.82_(DSC05979).jpg) |
| pf-148745902 / Corvette Z06 GT3.R | [MarcelX42](https://commons.wikimedia.org/w/index.php?title=User:MarcelX42&amp;action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1136641722](https://commons.wikimedia.org/wiki/File:2024_6_Hours_of_Spa-Francorchamps_TF_Sport_Chevrolet_Corvette_Z06_GT3.R_No.81_(DSC02653).jpg) |
| pf-148815378 / Corvette Z06 GT3.R | [MarcelX42](https://commons.wikimedia.org/w/index.php?title=User:MarcelX42&amp;action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1136639076](https://commons.wikimedia.org/wiki/File:2024_6_Hours_of_Spa-Francorchamps_TF_Sport_Chevrolet_Corvette_Z06_GT3.R_No.82_(DSC03277).jpg) |
| pf-149528583 / Corvette Z06 GT3.R | [Bzimmer260](https://commons.wikimedia.org/w/index.php?title=User:Bzimmer260&amp;action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1152010006](https://commons.wikimedia.org/wiki/File:Corvette_Z06_GT3.R.jpg) |
| pf-149944338 / Corvette Z06 GT3.R | [SmackJam](https://commons.wikimedia.org/wiki/User:SmackJam) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 995518072](https://commons.wikimedia.org/wiki/File:AWA_Corvette_WGI24_04.jpg) |
| pf-192199001 / Corvette Z06 GT3.R | [MarcelX42](https://commons.wikimedia.org/w/index.php?title=User:MarcelX42&amp;action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1249588242](https://commons.wikimedia.org/wiki/File:2026_6_Hours_of_Spa-Francorchamps_TF_Sport_Chevrolet_Corvette_Z06_LMGT3.R_No.33_(DSC06746).jpg) |
| pf-193140121 / Corvette Z06 GT3.R | [MarcelX42](https://commons.wikimedia.org/w/index.php?title=User:MarcelX42&amp;action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1225850255](https://commons.wikimedia.org/wiki/File:2026_6_Hours_of_Spa-Francorchamps_TF_Sport_Chevrolet_Corvette_Z06_LMGT3.R_No.33_(DSC09649).jpg) |
| pf-167693091 / Corvette Z06 GT3.R | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1133086226](https://commons.wikimedia.org/wiki/File:24H_Le_Mans_2025_Nr._13.jpg) |
| pf-168022483 / Corvette Z06 GT3.R | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1161372720](https://commons.wikimedia.org/wiki/File:24H_Le_Mans_2025_Nr._13_(2).jpg) |
| pf-178603661 / Corvette Z06 GT3.R | [Mickael Le rouzic](https://www.flickr.com/people/199438934@N08) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons revision 1132080078](https://commons.wikimedia.org/wiki/File:2025_24_Hours_of_Le_Mans_(54917515478).jpg) |
| pf-178603963 / Corvette Z06 GT3.R | [Mickael Le rouzic](https://www.flickr.com/people/199438934@N08) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons revision 1131433434](https://commons.wikimedia.org/wiki/File:2025_24_Hours_of_Le_Mans_(54917598520).jpg) |
| pf-178604082 / Corvette Z06 GT3.R | [Mickael Le rouzic](https://www.flickr.com/people/199438934@N08) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons revision 1132121970](https://commons.wikimedia.org/wiki/File:2025_24_Hours_of_Le_Mans_(54917597905).jpg) |
| pf-178604896 / Corvette Z06 GT3.R | [Mickael Le rouzic](https://www.flickr.com/people/199438934@N08) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons revision 1131529897](https://commons.wikimedia.org/wiki/File:2025_24_Hours_of_Le_Mans_(54917511183).jpg) |
| pf-170174647 / Corvette Z06 GT3.R | [SmackJam](https://commons.wikimedia.org/wiki/User:SmackJam) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1162996198](https://commons.wikimedia.org/wiki/File:DXDT_Corvette_WGI25_01.jpg) |
| pf-170174660 / Corvette Z06 GT3.R | [SmackJam](https://commons.wikimedia.org/wiki/User:SmackJam) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1162996284](https://commons.wikimedia.org/wiki/File:DXDT_Corvette_WGI25_07.jpg) |
| pf-164060222 / GT3 EVO（2020） | [AidenT06](https://commons.wikimedia.org/w/index.php?title=User:AidenT06&amp;action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1069794591](https://commons.wikimedia.org/wiki/File:Mercedes-AMG_GT3_Evo_of_2_Seas_Motorsports_(2025_British_GT_Donington_Park).jpg) |
| pf-181685109 / GT3 EVO（2020） | [Alexandre Prevot from Nancy, France](https://www.flickr.com/people/32569229@N06) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1222847840](https://commons.wikimedia.org/wiki/File:Mercedes-AMG_GT3_Evo_(55034075618).jpg) |
| pf-182929095 / GT3 EVO（2020） | [Thomas Vogt from Paderborn, Deutschland](https://www.flickr.com/people/66451944@N03) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons revision 1281317667](https://commons.wikimedia.org/wiki/File:Mercedes-AMG_GT3_EVO_(55058227513).jpg) |
| pf-167693391 / GT3 EVO（2020） | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1133089495](https://commons.wikimedia.org/wiki/File:24H_Le_Mans_2025_Nr._61.jpg) |
| pf-168059861 / GT3 EVO（2020） | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1122198439](https://commons.wikimedia.org/wiki/File:24H_Le_Mans_2025_Nr._60_(3).jpg) |
| pf-178603621 / GT3 EVO（2020） | [Mickael Le rouzic](https://www.flickr.com/people/199438934@N08) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons revision 1218630951](https://commons.wikimedia.org/wiki/File:2025_24_Hours_of_Le_Mans_(54917541724).jpg) |
| pf-178603889 / GT3 EVO（2020） | [Mickael Le rouzic](https://www.flickr.com/people/199438934@N08) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons revision 1131508948](https://commons.wikimedia.org/wiki/File:2025_24_Hours_of_Le_Mans_(54917297041).jpg) |
| pf-178604110 / GT3 EVO（2020） | [Mickael Le rouzic](https://www.flickr.com/people/199438934@N08) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons revision 1132121791](https://commons.wikimedia.org/wiki/File:2025_24_Hours_of_Le_Mans_(54917597790).jpg) |
| pf-178604840 / GT3 EVO（2020） | [Mickael Le rouzic](https://www.flickr.com/people/199438934@N08) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons revision 1129746897](https://commons.wikimedia.org/wiki/File:2025_24_Hours_of_Le_Mans_(54916433222).jpg) |
| pf-178605363 / GT3 EVO（2020） | [Mickael Le rouzic](https://www.flickr.com/people/199438934@N08) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons revision 1131511910](https://commons.wikimedia.org/wiki/File:2025_24_Hours_of_Le_Mans_(54917507133).jpg) |
| pf-119430302 / GT-R NISMO GT3（2018规格） | [Tokumeigakarinoaoshima](https://commons.wikimedia.org/wiki/User:Tokumeigakarinoaoshima) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1166273356](https://commons.wikimedia.org/wiki/File:No.34_BUSOU_raffinee_GT-R_after_2022_Takanoko_no_Hotel_Suzuka_GT_300km_(1).jpg) |
| pf-120607849 / GT-R NISMO GT3（2018规格） | [Tokumeigakarinoaoshima](https://commons.wikimedia.org/wiki/User:Tokumeigakarinoaoshima) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1166274422](https://commons.wikimedia.org/wiki/File:No.34_BUSOU_raffinee_GT-R_at_2022_Takanoko_no_Hotel_Suzuka_GT_300km_(24).jpg) |
| pf-130258834 / GT-R NISMO GT3（2018规格） | [Tokumeigakarinoaoshima](https://commons.wikimedia.org/wiki/User:Tokumeigakarinoaoshima) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1173311957](https://commons.wikimedia.org/wiki/File:No.34_BUSOU_raffinee_GT-R_at_2022_Takanoko_no_Hotel_Suzuka_GT_300km_(101).jpg) |
| pf-164060221 / Vantage AMR GT3 EVO（2024） | [AidenT06](https://commons.wikimedia.org/wiki/User:AidenT06?action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1198345235](https://commons.wikimedia.org/wiki/File:Aston_Martin_Vantage_GT3_Evo_of_Beechdean_Motorsport_(2025_British_GT_Donington_Park).jpg) |
| pf-172570103 / Vantage AMR GT3 EVO（2024） | [MrWalkr](https://commons.wikimedia.org/wiki/User:MrWalkr) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1212721118](https://commons.wikimedia.org/wiki/File:2024_Aston_Martin_Vantage_V8_GT3_LC25.jpg) |
| pf-178605185 / Vantage AMR GT3 EVO（2024） | [Mickael Le rouzic](https://www.flickr.com/people/199438934@N08) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons revision 1129269699](https://commons.wikimedia.org/wiki/File:2025_24_Hours_of_Le_Mans_(54917543539).jpg) |
| pf-178605208 / Vantage AMR GT3 EVO（2024） | [Mickael Le rouzic](https://www.flickr.com/people/199438934@N08) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [Commons revision 1129270239](https://commons.wikimedia.org/wiki/File:2025_24_Hours_of_Le_Mans_(54917543449).jpg) |
| pf-121350294 / Vantage AMR GT3（2019车身／澳洲Trophy） | [SmackJam](https://commons.wikimedia.org/wiki/User:SmackJam) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 795909493](https://commons.wikimedia.org/wiki/File:Magnus_44_Aston_WGI22.jpg) |
| pf-100154241 / 911 GT3 R（991.2／按悉尼官方标注） | [NVer](https://commons.wikimedia.org/w/index.php?title=User:NVer&amp;action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1269912466](https://commons.wikimedia.org/wiki/File:IronForce_by_RING_POLICE_Porsche911_GT3_R_2019.jpg) |
| pf-106549686 / 911 GT3 R（991.2／按悉尼官方标注） | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1269181821](https://commons.wikimedia.org/wiki/File:GT_Masters_2021_Spielberg_Nr._92.jpg) |
| pf-106570441 / 911 GT3 R（991.2／按悉尼官方标注） | [Danosaur jr](https://commons.wikimedia.org/w/index.php?title=User:Danosaur_jr&amp;action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1260526775](https://commons.wikimedia.org/wiki/File:Falken-Porsche-33-44_N24H.jpg) |
| pf-118352640 / 911 GT3 R（991.2／按悉尼官方标注） | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1269915055](https://commons.wikimedia.org/wiki/File:24H_Series_2022_Spa_Nr._91.jpg) |
| pf-118660306 / 911 GT3 R（991.2／按悉尼官方标注） | [Lukas Raich](https://commons.wikimedia.org/wiki/User:Lukas_Raich) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1270539734](https://commons.wikimedia.org/wiki/File:ADAC_GT_Masters_2022_Spielberg_Nr._22.jpg) |
| pf-124115178 / 911 GT3 R（991.2／按悉尼官方标注） | [DoomWarrior](https://commons.wikimedia.org/wiki/User:DoomWarrior) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1269915063](https://commons.wikimedia.org/wiki/File:Alfred_Renauer_Porsche_Porsche_911_GT3_R_GT_World_Challenge_Hockenheim_2022.jpg) |
| pf-91965071 / 911 GT3 R（991.2／按悉尼官方标注） | [Louis Proust](https://commons.wikimedia.org/w/index.php?title=User:Louis_Proust&amp;action=edit&amp;redlink=1) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Commons revision 1269915268](https://commons.wikimedia.org/wiki/File:Porsche_911_GT3_R_Gen_II.jpg) |
