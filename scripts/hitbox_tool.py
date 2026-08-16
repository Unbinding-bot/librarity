"""
Library Hitbox Tool
====================
Select clickable areas on your library PNG and export them as percentages.

Usage:
    python scripts/hitbox_tool.py

Controls:
    Click + Drag     Draw a new hitbox
    Right-click box  Delete that box
    Double-click box Rename that box
    S                Save to data/hitboxes.json
    Z                Undo last box
    C                Clear all boxes
    Q / Escape       Quit

Requirements:
    pip install pillow
    (tkinter is included with standard Python on Windows)
"""

import json
import os
import tkinter as tk
from tkinter import simpledialog, messagebox
from PIL import Image, ImageTk

# ── Config ────────────────────────────────────────────────────────────────────

IMAGE_PATH  = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images', 'backgrounds', 'library.png')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'hitboxes.json')

# How much to scale the image to fit your screen (0.0-1.0)
# The tool auto-detects a good scale — override here if needed
SCALE_OVERRIDE = None   # e.g. 0.4 to force 40%

# Default hitbox names to suggest when drawing (cycle through these)
DEFAULT_NAMES = [
    'games',
    'tools',
    'logbook',
    'faculty',
    'coming-soon',
]

# Colours per name (hex)
BOX_COLORS = {
    'games':       '#4CAF50',
    'tools':       '#2196F3',
    'logbook':     '#FF9800',
    'faculty':     '#9C27B0',
    'coming-soon': '#607D8B',
}
DEFAULT_COLOR = '#E91E63'

# ── App ───────────────────────────────────────────────────────────────────────

class HitboxTool:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title('Library Hitbox Tool — S=Save  Z=Undo  C=Clear  Q=Quit')

        # Load image
        if not os.path.exists(IMAGE_PATH):
            messagebox.showerror(
                'Image not found',
                f'Could not find:\n{IMAGE_PATH}\n\n'
                'Place your library PNG at:\n'
                'assets/images/backgrounds/library.png'
            )
            root.destroy()
            return

        self.img_orig = Image.open(IMAGE_PATH)
        self.img_w, self.img_h = self.img_orig.size

        # Auto-scale to fit screen
        sw = root.winfo_screenwidth()  - 80
        sh = root.winfo_screenheight() - 120
        scale = SCALE_OVERRIDE or min(sw / self.img_w, sh / self.img_h, 1.0)
        self.scale   = scale
        self.disp_w  = int(self.img_w * scale)
        self.disp_h  = int(self.img_h * scale)

        # Resize for display
        disp_img = self.img_orig.resize((self.disp_w, self.disp_h), Image.LANCZOS)
        self.tk_img = ImageTk.PhotoImage(disp_img)

        # Canvas
        self.canvas = tk.Canvas(root, width=self.disp_w, height=self.disp_h, cursor='crosshair')
        self.canvas.pack()
        self.canvas.create_image(0, 0, anchor='nw', image=self.tk_img)

        # State
        self.boxes       = []    # list of dicts: {name, x1,y1,x2,y2 (display px)}
        self.drag_start  = None
        self.active_rect = None  # canvas item being drawn
        self.name_cycle  = 0

        # Status bar
        self.status_var = tk.StringVar(value='Click and drag to draw a hitbox')
        tk.Label(root, textvariable=self.status_var, anchor='w',
                 bg='#222', fg='white', padx=8).pack(fill='x')

        # Info panel
        self.info_var = tk.StringVar(value='No boxes yet')
        tk.Label(root, textvariable=self.info_var, anchor='w',
                 bg='#333', fg='#aaa', padx=8, font=('Consolas', 9)).pack(fill='x')

        # Bindings
        self.canvas.bind('<ButtonPress-1>',   self._on_press)
        self.canvas.bind('<B1-Motion>',        self._on_drag)
        self.canvas.bind('<ButtonRelease-1>',  self._on_release)
        self.canvas.bind('<Button-3>',         self._on_right_click)
        self.canvas.bind('<Double-Button-1>',  self._on_double_click)
        root.bind('<s>', lambda e: self._save())
        root.bind('<S>', lambda e: self._save())
        root.bind('<z>', lambda e: self._undo())
        root.bind('<Z>', lambda e: self._undo())
        root.bind('<c>', lambda e: self._clear())
        root.bind('<C>', lambda e: self._clear())
        root.bind('<q>', lambda e: root.destroy())
        root.bind('<Escape>', lambda e: root.destroy())

        print(f'Image: {self.img_w}×{self.img_h}  →  displayed at {self.disp_w}×{self.disp_h}  (scale {scale:.3f})')
        print(f'Output will be saved to: {OUTPUT_PATH}')

    # ── Drawing ───────────────────────────────────────────────────────────────

    def _on_press(self, event):
        self.drag_start = (event.x, event.y)
        self.active_rect = self.canvas.create_rectangle(
            event.x, event.y, event.x, event.y,
            outline='white', width=2, dash=(4, 2)
        )

    def _on_drag(self, event):
        if self.active_rect and self.drag_start:
            x0, y0 = self.drag_start
            self.canvas.coords(self.active_rect, x0, y0, event.x, event.y)

    def _on_release(self, event):
        if not self.drag_start:
            return
        x0, y0 = self.drag_start
        x1, y1 = event.x, event.y

        # Ignore tiny drags (accidental clicks)
        if abs(x1 - x0) < 8 or abs(y1 - y0) < 8:
            self.canvas.delete(self.active_rect)
            self.active_rect = None
            self.drag_start  = None
            return

        # Normalise so top-left is always (x0,y0)
        x0, x1 = min(x0, x1), max(x0, x1)
        y0, y1 = min(y0, y1), max(y0, y1)

        # Suggest a name
        suggestion = DEFAULT_NAMES[self.name_cycle % len(DEFAULT_NAMES)] \
            if self.name_cycle < len(DEFAULT_NAMES) else f'area-{len(self.boxes)+1}'

        name = simpledialog.askstring(
            'Name this hitbox',
            f'Enter a name for this hitbox\n(e.g. games, tools, logbook):',
            initialvalue=suggestion,
            parent=self.root
        )

        if not name:
            self.canvas.delete(self.active_rect)
            self.active_rect = None
            self.drag_start  = None
            return

        name = name.strip().lower().replace(' ', '-')
        color = BOX_COLORS.get(name, DEFAULT_COLOR)

        # Remove temp rect, draw final one
        self.canvas.delete(self.active_rect)
        rect_id = self.canvas.create_rectangle(
            x0, y0, x1, y1,
            outline=color, fill=color, width=2,
            stipple='gray25'          # 25% fill — Tkinter's way of doing transparency
        )
        label_id = self.canvas.create_text(
            x0 + 6, y0 + 6,
            text=name, anchor='nw',
            fill='white', font=('Arial', 10, 'bold')
        )

        self.boxes.append({
            'name': name,
            'x1_px': x0, 'y1_px': y0, 'x2_px': x1, 'y2_px': y1,
            'rect_id': rect_id, 'label_id': label_id
        })

        self.name_cycle += 1
        self.active_rect = None
        self.drag_start  = None
        self._update_info()
        self.status_var.set(f'✓ "{name}" added  —  {len(self.boxes)} box(es) total')

    # ── Interaction ───────────────────────────────────────────────────────────

    def _box_at(self, x, y):
        """Return the box dict that contains (x,y), or None."""
        for box in reversed(self.boxes):  # top-most first
            if box['x1_px'] <= x <= box['x2_px'] and box['y1_px'] <= y <= box['y2_px']:
                return box
        return None

    def _on_right_click(self, event):
        box = self._box_at(event.x, event.y)
        if box:
            if messagebox.askyesno('Delete', f'Delete hitbox "{box["name"]}"?', parent=self.root):
                self.canvas.delete(box['rect_id'])
                self.canvas.delete(box['label_id'])
                self.boxes.remove(box)
                self._update_info()

    def _on_double_click(self, event):
        box = self._box_at(event.x, event.y)
        if not box:
            return
        new_name = simpledialog.askstring(
            'Rename hitbox',
            f'Rename "{box["name"]}" to:',
            initialvalue=box['name'],
            parent=self.root
        )
        if new_name:
            new_name = new_name.strip().lower().replace(' ', '-')
            box['name'] = new_name
            color = BOX_COLORS.get(new_name, DEFAULT_COLOR)
            self.canvas.itemconfig(box['rect_id'], outline=color, fill=color + '33')
            self.canvas.itemconfig(box['label_id'], text=new_name)
            self._update_info()

    def _undo(self):
        if self.boxes:
            box = self.boxes.pop()
            self.canvas.delete(box['rect_id'])
            self.canvas.delete(box['label_id'])
            self._update_info()
            self.status_var.set(f'Undid "{box["name"]}"')

    def _clear(self):
        if messagebox.askyesno('Clear all', 'Delete all hitboxes?', parent=self.root):
            for box in self.boxes:
                self.canvas.delete(box['rect_id'])
                self.canvas.delete(box['label_id'])
            self.boxes.clear()
            self._update_info()
            self.status_var.set('Cleared all boxes')

    # ── Save ──────────────────────────────────────────────────────────────────

    def _save(self):
        if not self.boxes:
            messagebox.showwarning('Nothing to save', 'Draw at least one hitbox first.', parent=self.root)
            return

        output = []
        for box in self.boxes:
            # Convert display-px → percentages of original image
            pct_x = (box['x1_px'] / self.disp_w) * 100
            pct_y = (box['y1_px'] / self.disp_h) * 100
            pct_w = ((box['x2_px'] - box['x1_px']) / self.disp_w) * 100
            pct_h = ((box['y2_px'] - box['y1_px']) / self.disp_h) * 100

            output.append({
                'name': box['name'],
                'x':    round(pct_x, 4),
                'y':    round(pct_y, 4),
                'w':    round(pct_w, 4),
                'h':    round(pct_h, 4),
                # Also save original-image pixel coords for reference
                '_px': {
                    'x1': round(box['x1_px'] / self.scale),
                    'y1': round(box['y1_px'] / self.scale),
                    'x2': round(box['x2_px'] / self.scale),
                    'y2': round(box['y2_px'] / self.scale),
                }
            })

        os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
        with open(OUTPUT_PATH, 'w') as f:
            json.dump({'image': 'assets/images/backgrounds/library.png', 'hitboxes': output}, f, indent=2)

        self.status_var.set(f'✓ Saved {len(output)} hitbox(es) → {OUTPUT_PATH}')
        print(f'\nSaved {len(output)} hitboxes to {OUTPUT_PATH}')
        for h in output:
            print(f"  {h['name']:15s}  x={h['x']:.1f}%  y={h['y']:.1f}%  w={h['w']:.1f}%  h={h['h']:.1f}%")

    # ── Info ──────────────────────────────────────────────────────────────────

    def _update_info(self):
        if not self.boxes:
            self.info_var.set('No boxes yet')
            return
        parts = [f"{b['name']}({b['x1_px']},{b['y1_px']}→{b['x2_px']},{b['y2_px']})"
                 for b in self.boxes]
        self.info_var.set('  |  '.join(parts))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    root = tk.Tk()
    root.resizable(False, False)
    app = HitboxTool(root)
    root.mainloop()
