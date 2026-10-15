export type View =
  | { name: 'home' }
  | { name: 'buy' }
  | { name: 'cheer'; channel?: string }
  | { name: 'history'; channel?: string }
  | { name: 'settings' };

export type ViewName = View['name'];

export type Go = (view: View) => void;
