import { FACTORY_KB, type KbDoc } from "./factoryKb";

/**
 * DEMO DOCUMENTS. Short, made-up examples so the Copilot can be tried before real manuals are
 * uploaded. They are not this plant's procedures or any manufacturer's specifications. They are
 * marked as samples in the knowledge base and can be deleted.
 */
const NOTE = "SAMPLE DOCUMENT FOR DEMONSTRATION ONLY. Not a real procedure or specification.";

const CORE: KbDoc[] = [
  {
    name: "Sample - Corrugator troubleshooting guide.txt",
    pages: [
      {
        page: 1,
        text: `${NOTE}\n\nCorrugator troubleshooting guide. Section 1: Frequent paper breaks.\nPaper breaks at the reel stand are usually caused by damaged reel edges, a weak splice, or uneven web tension. Check the reel edges for nicks and crushed paper before mounting. Check that the splice tape is applied straight and fully across the width of the reel. Check the brake and tension settings on the reel stand and compare them to the setting card.\nIf breaks repeat on the same reel grade, quarantine the reels and report the batch to Stores and Quality. Do not reach into the reel stand while it is running. Stop the machine and apply lock-out and tag-out before clearing a web jam. Only authorised maintenance staff may adjust tension hardware.`,
      },
      {
        page: 2,
        text: `Section 2: Steam pressure drops.\nIf steam pressure drops at the single facer, first check the boiler pressure and the steam supply valve position. Check the condensate traps for blockage and the steam hoses for leaks. A low pressure reading together with weak board bonding points to a steam supply problem rather than a glue problem.\nRecommended action: inform the boiler operator, slow the corrugator until the pressure recovers, and record the time and reading in the shift log. Steam lines and hot rolls cause severe burns. Never open a steam line or touch hot rolls. Work on steam systems is for qualified personnel only, after lock-out and tag-out and depressurising the line.`,
      },
      {
        page: 3,
        text: `Section 3: Warped boards.\nWarp is a bow or curl in the finished board. Common causes are a moisture imbalance between the top and bottom liners, uneven steam on the preheaters, and glue applied too heavily on one side. Check the wrap angle and preheater settings for both liners. Check the moisture of the incoming reels against the incoming reel limit in the paper specification. Check the double backer for uneven heating.\nRecommended action: balance the heat on the top and bottom liner, adjust in small steps, and recheck a sample board after the next 500 metres. Hold affected pallets for retest. Do not bypass the double backer guards to inspect the board while the machine is running.`,
      },
    ],
  },
  {
    name: "Sample - Single facer maintenance procedure.txt",
    pages: [
      {
        page: 1,
        text: `${NOTE}\n\nSingle facer maintenance procedure. Required tools: lock-out and tag-out kit, heat-resistant gloves, inspection torch, feeler gauges, lint-free cloth, approved lubricant.\nBefore starting, stop the machine, let the hot rolls cool to a safe temperature, and apply lock-out and tag-out. Confirm zero energy before any inspection. Only trained and authorised maintenance personnel may carry out this procedure.`,
      },
      {
        page: 2,
        text: `Inspection steps: Check the fluting rolls for wear, chips and glue build-up. Check the glue roll and doctor blade for damage and an even glue film. Check the pressure roll alignment and the condition of the bearings. Check the steam joints and hoses for leaks.\nRecommended procedure: clean the rolls with the approved cleaner, lubricate the bearings with the approved lubricant at the interval in the maintenance schedule, and record readings. Replace worn parts. Never remove or disable guards or interlocks to speed up maintenance. Restore every guard before removing the lock-out.`,
      },
    ],
  },
  {
    name: "Sample - Reel changing SOP.txt",
    pages: [
      {
        page: 1,
        text: `${NOTE}\n\nStandard operating procedure: changing paper reels at the reel stand.\n1. Confirm the next reel grade, width and weight against the production order. 2. Inspect the new reel for edge damage, moisture marks and the correct label. 3. Load the reel onto the spare arm using the approved lifting equipment. 4. Prepare the splice: trim the reel end straight and apply the splice tape across the full width. 5. Make the splice at the planned time and watch the web tension until it settles.\nSafety: keep hands clear of the nip and the splicer. Use the lifting equipment only after training. Lock-out and tag-out applies when clearing any jam.`,
      },
    ],
  },
  {
    name: "Sample - Board and flute reference.txt",
    pages: [
      {
        page: 1,
        text: `${NOTE}\n\nFlute reference. B flute has a finer, flatter flute. It gives a smoother surface for printing and good crush resistance for its thickness. It is often used for retail boxes and packs of small items. C flute has a larger, taller flute. It gives better stacking strength and cushioning, and a thicker board. It is often used for shipping cartons.\nBC double wall combines a B and a C flute layer for heavy loads. Choose the flute from the product weight, the stacking height and the print quality needed.`,
      },
      {
        page: 2,
        text: `Difference between B flute and C flute. B flute is about 3 mm tall and C flute is about 4 mm tall. B flute: flatter surface, better print quality, good crush resistance, used for retail boxes and small items. C flute: taller flute, better cushioning and stacking strength, thicker board, used for shipping cartons and heavier or fragile goods. The difference in height changes the board thickness, so a flute change on the corrugator is a changeover. E flute is finer than B and is used for fine print and small retail packs. BC double wall joins a B and a C layer for heavy loads and export.`,
      },
    ],
  },
];

/** Every demo document: the four short originals, then the wider synthetic factory knowledge base. */
export const SAMPLE_DOCS: KbDoc[] = [...CORE, ...FACTORY_KB];
