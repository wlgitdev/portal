import type { ConnectedPosition } from '@angular/cdk/overlay';

// Right edge of the trigger to the right edge of the menu, opening
// downward — shared by every top-bar-style menu trigger (account menu,
// Group by) so they open the same way (design Revision 4, spec P8 R24).
export const END_ALIGNED_MENU_POSITION: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
];
