import { expect as detoxExpect } from 'detox';

export const Assertions = {
  async isVisible(element: Detox.IndexableNativeElement) {
    await detoxExpect(element).toBeVisible();
  },

  async isNotVisible(element: Detox.IndexableNativeElement) {
    await detoxExpect(element).not.toBeVisible();
  },

  async hasText(element: Detox.IndexableNativeElement, text: string) {
    await detoxExpect(element).toHaveText(text);
  },

  async hasId(element: Detox.IndexableNativeElement, id: string) {
    await detoxExpect(element).toHaveId(id);
  },

  async isFocused(element: Detox.IndexableNativeElement) {
    await detoxExpect(element).toBeFocused();
  },

  async toExist(element: Detox.IndexableNativeElement) {
    await detoxExpect(element).toExist();
  },
};

export const Actions = {
  async tap(element: Detox.IndexableNativeElement) {
    await element.tap();
  },

  async typeText(element: Detox.IndexableNativeElement, text: string) {
    await element.typeText(text);
  },

  async replaceText(element: Detox.IndexableNativeElement, text: string) {
    await element.replaceText(text);
  },

  async clearText(element: Detox.IndexableNativeElement) {
    await element.clearText();
  },

  async scroll(
    distance: number,
    direction: 'up' | 'down' | 'left' | 'right' = 'down',
  ) {
    await element(by.id('scroll-view')).scroll(distance, direction);
  },

  async swipe(
    direction: 'up' | 'down' | 'left' | 'right',
    speed: 'fast' | 'slow' = 'fast',
    percentage = 0.75,
  ) {
    await element(by.id('scroll-view')).swipe(direction, speed, percentage);
  },
};
