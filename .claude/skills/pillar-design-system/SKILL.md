---
name: pillar-design
description: Use this skill to generate well-branded interfaces and assets for Pillar, an open-source medication dispenser for people with neurodivergency and disabilities — either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. Always link `colors_and_type.css` rather than re-defining tokens; it carries the full color, type, spacing, radius, shadow, motion, and dark-mode system.

Key rules to remember:
- Voice is calm, plainspoken, warm. Never alarm a user. Never use emoji in-product.
- Every semantic state is color + icon + label — never color alone.
- Base font is 17px. Lexend for text, Atkinson Hyperlegible for numerals.
- Touch targets: 44px min, 56px for primary mobile actions.
- Focus ring is always visible, double-ring on any background.
- Iconography: Phosphor duotone (ph-duotone ph-*) via CDN.
- Reduced motion: durations already collapse to 0ms in the token layer.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
