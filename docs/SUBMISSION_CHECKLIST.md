# BCOLBD 2026 submission checklist

## Drive package

- Required Google Drive folder name: `Team Name_Category`
- Sharing: enable both **View** and **Download** access for the submission reviewers.
- Final deadline: **4 September 2026, 11:59 PM BST**.
- Freeze the submitted files at the deadline. Do not edit or replace them afterward.
- Event timing: allow 20 minutes for presentation/demonstration, followed by 10 minutes of Q&A; join 30 minutes early.

## Required files

| Required item                                                     | Exact final filename                               | Audit status on 2026-09-03                                                                                                                                                                                         |
| ----------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| English whitepaper, maximum 20 pages                              | `DefChain Whitepaper BCOLBD 2026.pdf`              | **Not found locally.** A prior review described a 14-page A4 copy, but that file was unavailable in the repository and standard Downloads locations for this final audit.                                          |
| 48 × 36 inch landscape poster board (14400 × 10800 px at 300 dpi) | `DefChain Poster Board BCOLBD 2026.pdf`            | **Corrected export not found.** Do not submit the previously reviewed `DefChain Poster Board RBT.pdf`: its 768 × 600 point page, “Poster: Wastopia” metadata, and hidden Wastopia/waste text fail the requirement. |
| 10-minute 16:9 English pitch presentation                         | `DefChain Pitch Presentation BCOLBD 2026.pptx`     | **Not found locally.** The one-minute introduction and presentation must identify each member’s responsibilities.                                                                                                  |
| Prototype demo credential                                         | `DefChain_Demo_Credential.txt`                     | **Verified in `submission/`.** Contains local URLs, startup instructions, synthetic account names, and judge sequence without generated secrets.                                                                   |
| 600-second pitch video                                            | `DefChain Pitch Video 600 Seconds BCOLBD 2026.mp4` | **Not found locally.**                                                                                                                                                                                             |

The external submission package is incomplete until the four missing mandatory media/documents are present and inspected.

## Poster correction requiring the editable source

Open the original Canva or Figma design, set the canvas to exactly 48 × 36 inches landscape, remove every hidden Wastopia/template layer, set the document title/metadata to DefChain, and export a fresh PDF. Do not stretch or crop the technical content. Confirm the exported PDF has a 4:3 landscape page and contains only DefChain metadata and extractable text before using the final filename above.

## Demo web

- Application: `http://localhost:5173`
- Fabric-backed health: `http://localhost:5173/api/v1/health`
- Detailed startup and recovery: `docs/QUICKSTART.md`
- Demo credential handoff: `submission/DefChain_Demo_Credential.txt`
- Accounts: `police.investigator`, `rab.officer`, `bgb.officer`, `customs.officer`, and `auditor`; use the application’s one-click synthetic actor presets. The revoked and exhausted-budget fixtures are documented in the root README for control checks.

The existing React/Express/Fabric application is the prototype website. Public cloud hosting is not required by the supplied guideline. Do not present a frontend-only deployment as working DefChain; if a submission form explicitly requires a public URL, confirm that requirement before planning deployment of the complete Fabric-backed stack.
