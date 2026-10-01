# Duara Flow workspace redesign

## Goal
Transform the existing product into the selected Notion-inspired workspace direction while preserving every route, workflow, integration, permission, and data connection.

## Implementation
- Establish intentional light and dark themes using the selected cool workspace palette, persistent theme selection, system typography, restrained radii, thin borders, and minimal shadows.
- Refine shared buttons, inputs, cards, tabs, dialogs, dropdowns, tables, status elements, and loading states so changes apply consistently throughout the product.
- Restyle the existing landing page in its current section order: lightweight navigation, controlled image-led hero, editorial section rhythm, compact feature blocks, clear traceability flow, restrained metrics, and simpler footer.
- Add the theme control to public navigation and dashboard workspace controls without changing navigation structure.
- Apply the workspace styling to all seven dashboard shells, preserving their current panels and behavior while improving sidebars, headers, spacing, surfaces, and mobile overflow safety.
- Align sign-in, sign-up, password recovery, contact, marketplace, and shared popups with the same visual language.
- Keep animation subtle and respect reduced-motion preferences.

## Validation
- Check desktop and mobile landing pages for hierarchy, theme consistency, menu behavior, and horizontal overflow.
- Check sign-in and a real authenticated dashboard in both themes.
- Confirm key dialogs, controls, navigation, and data views remain functional.
- Resolve any build or runtime errors introduced by the redesign.

## Technical details
- Theme state will use a small shared provider backed by local storage and a root `dark` class.
- Semantic CSS tokens remain the source of color and surface styling; page code will not hardcode theme colors.
- Existing data queries, authentication calls, routes, translations, and backend code remain unchanged.
