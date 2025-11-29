import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext, filedialog

class SQLGeneratorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("SQL Bulk Data Entry Tool")
        self.root.geometry("900x600")

        # Data Storage
        self.entries = [] # List of lists containing Entry widgets
        self.column_names = []
        self.table_name = ""
        self.prisma_models = {} # Store parsed models { "User": ["id", "email"] }

        # Styles
        style = ttk.Style()
        style.configure("Bold.TLabel", font=("Helvetica", 10, "bold"))

        # --- SETUP FRAME (Top) ---
        setup_frame = ttk.LabelFrame(root, text="Step 1: Define Model", padding=10)
        setup_frame.pack(fill="x", padx=10, pady=5)

        # Table Name (Label + Entry + Combobox for Prisma)
        ttk.Label(setup_frame, text="Table Name:").grid(row=0, column=0, padx=5, sticky="w")
        
        self.table_name_var = tk.StringVar()
        
        # Default Entry widget
        self.table_entry = ttk.Entry(setup_frame, textvariable=self.table_name_var, width=25)
        self.table_entry.grid(row=0, column=1, padx=5, sticky="w")
        
        # Combobox (Hidden until Prisma is loaded)
        self.model_combo = ttk.Combobox(setup_frame, textvariable=self.table_name_var, state="readonly", width=23)
        self.model_combo.bind("<<ComboboxSelected>>", self.on_model_select)

        # Columns Input
        ttk.Label(setup_frame, text="Columns:").grid(row=0, column=2, padx=5, sticky="w")
        self.columns_var = tk.StringVar()
        self.columns_entry = ttk.Entry(setup_frame, textvariable=self.columns_var, width=35)
        self.columns_entry.grid(row=0, column=3, padx=5, sticky="w")
        
        # Buttons
        self.load_schema_btn = ttk.Button(setup_frame, text="Load Prisma", command=self.load_prisma_schema)
        self.load_schema_btn.grid(row=0, column=4, padx=5)

        self.init_btn = ttk.Button(setup_frame, text="Create Table", command=self.initialize_grid)
        self.init_btn.grid(row=0, column=5, padx=5)

        # Example hint
        ttk.Label(setup_frame, text="(e.g. id, name, age)", foreground="gray").grid(row=1, column=3, sticky="w", padx=5)

        # --- TABLE FRAME (Middle - Scrollable) ---
        self.table_container = ttk.LabelFrame(root, text="Step 2: Input Data", padding=10)
        self.table_container.pack(fill="both", expand=True, padx=10, pady=5)

        # Configure grid layout for the container to hold canvas and scrollbars
        self.table_container.grid_rowconfigure(0, weight=1)
        self.table_container.grid_columnconfigure(0, weight=1)

        # Canvas for scrolling
        self.canvas = tk.Canvas(self.table_container)
        
        # Scrollbars
        self.v_scrollbar = ttk.Scrollbar(self.table_container, orient="vertical", command=self.canvas.yview)
        self.h_scrollbar = ttk.Scrollbar(self.table_container, orient="horizontal", command=self.canvas.xview)
        
        self.scrollable_frame = ttk.Frame(self.canvas)

        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        )

        self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        
        # Configure canvas to use both scrollbars
        self.canvas.configure(yscrollcommand=self.v_scrollbar.set, xscrollcommand=self.h_scrollbar.set)

        # Grid placement
        self.canvas.grid(row=0, column=0, sticky="nsew")
        self.v_scrollbar.grid(row=0, column=1, sticky="ns")
        self.h_scrollbar.grid(row=1, column=0, sticky="ew")

        # --- ACTION FRAME (Bottom) ---
        action_frame = ttk.Frame(root, padding=10)
        action_frame.pack(fill="x", padx=10, pady=5)

        self.add_row_btn = ttk.Button(action_frame, text="+ Add Row", command=self.add_row, state="disabled")
        self.add_row_btn.pack(side="left", padx=5)

        self.generate_btn = ttk.Button(action_frame, text="Generate SQL Query", command=self.generate_sql, state="disabled")
        self.generate_btn.pack(side="right", padx=5)

        self.reset_btn = ttk.Button(action_frame, text="Reset", command=self.reset_app)
        self.reset_btn.pack(side="right", padx=5)

    def load_prisma_schema(self):
        file_path = filedialog.askopenfilename(
            title="Select Prisma Schema",
            filetypes=[("Prisma Schema", "*.prisma"), ("All Files", "*.*")]
        )
        if not file_path:
            return
        
        try:
            self.parse_prisma(file_path)
            if self.prisma_models:
                # Switch Entry to Combobox
                self.table_entry.grid_remove()
                self.model_combo['values'] = list(self.prisma_models.keys())
                self.model_combo.grid(row=0, column=1, padx=5, sticky="w")
                
                # Auto-select first model
                first_model = list(self.prisma_models.keys())[0]
                self.model_combo.set(first_model)
                self.on_model_select(None)
                
                messagebox.showinfo("Success", f"Loaded {len(self.prisma_models)} models from schema.")
            else:
                messagebox.showwarning("Warning", "No models found in schema file.")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to parse schema: {e}")

    def parse_prisma(self, file_path):
        self.prisma_models = {}
        current_model = None
        
        # Standard scalar types in Prisma to distinguish columns from relations
        scalar_types = {
            'String', 'Boolean', 'Int', 'BigInt', 'Float', 
            'Decimal', 'DateTime', 'Json', 'Bytes', 'Unsupported'
        }

        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Remove comments
                if '//' in line:
                    line = line.split('//')[0].strip()
                
                if not line:
                    continue
                    
                # Start of model
                if line.startswith('model '):
                    parts = line.split()
                    if len(parts) >= 2:
                        current_model = parts[1]
                        self.prisma_models[current_model] = []
                
                # End of model
                elif line.startswith('}'):
                    current_model = None
                
                # Field definition
                elif current_model:
                    if line.startswith('@@'): continue # Skip block attributes
                    
                    parts = line.split()
                    if len(parts) >= 2:
                        field_name = parts[0]
                        field_type = parts[1]
                        
                        # Clean type (remove ? or [])
                        clean_type = field_type.rstrip('?[]')
                        
                        # Only include if it's a scalar type (avoids relations like 'posts Post[]')
                        # Also include enums roughly by checking if it starts with uppercase (User defined)
                        # But typically for raw SQL, we only want scalars. 
                        # To be safe, we add it if it's a known scalar OR if we aren't sure (user can delete it).
                        # Strict check:
                        if clean_type in scalar_types or clean_type.lower() == "enum": 
                             self.prisma_models[current_model].append(field_name)
                        # If it's an enum (often not in scalar list but is valid column), we might miss it.
                        # Heuristic: If it's a relation, it usually maps to another model.
                        # Let's trust the scalar list for now, but allow Enum-like names if needed.
                        # For now, let's include everything that ISNT a likely relation to keep it simple,
                        # or just include everything and let user delete. 
                        # BETTER LOGIC: If it's a known scalar, add it.
                        elif field_type.endswith('[]'):
                            # Definitely an array relation, skip
                            continue
                        else:
                            # Might be an Enum or a single relation. 
                            # If it's a single relation (e.g. `user User`), we usually have a `userId` field too.
                            # We usually want the `userId` field, not `user`.
                            # So we skip non-scalars.
                            pass
                        
                        # Note: We also need to capture 'userId' which is Int. That is caught by scalar_types.

    def on_model_select(self, event):
        model_name = self.table_name_var.get()
        if model_name in self.prisma_models:
            cols = self.prisma_models[model_name]
            self.columns_var.set(", ".join(cols))

    def initialize_grid(self):
        # Validation
        t_name = self.table_name_var.get().strip()
        c_names = self.columns_var.get().strip()

        if not t_name or not c_names:
            messagebox.showerror("Error", "Please provide both a table name and column names.")
            return

        self.table_name = t_name
        self.column_names = [c.strip() for c in c_names.split(',') if c.strip()]
        
        if not self.column_names:
            messagebox.showerror("Error", "No valid columns found.")
            return

        # Disable setup to prevent changing schema mid-entry
        self.table_entry.config(state="disabled")
        self.model_combo.config(state="disabled")
        self.columns_entry.config(state="disabled")
        self.init_btn.config(state="disabled")
        self.load_schema_btn.config(state="disabled")
        self.add_row_btn.config(state="normal")
        self.generate_btn.config(state="normal")

        # Create Headers
        for i, col in enumerate(self.column_names):
            lbl = ttk.Label(self.scrollable_frame, text=col, style="Bold.TLabel", borderwidth=1, relief="solid", padding=5, width=15, anchor="center")
            lbl.grid(row=0, column=i, sticky="nsew")

        # Start with 5 rows
        for _ in range(5):
            self.add_row()

    def add_row(self):
        row_idx = len(self.entries) + 1 # +1 because row 0 is headers
        current_row_entries = []
        
        for col_idx, _ in enumerate(self.column_names):
            entry = ttk.Entry(self.scrollable_frame, width=20)
            entry.grid(row=row_idx, column=col_idx, padx=1, pady=1)
            current_row_entries.append(entry)
        
        self.entries.append(current_row_entries)
        
        # Scroll to bottom
        self.canvas.update_idletasks()
        self.canvas.yview_moveto(1)

    def is_number(self, s):
        """Helper to check if a string represents a valid SQL number."""
        try:
            float(s)
            return True
        except ValueError:
            return False

    def generate_sql(self):
        if not self.entries:
            return

        value_groups = []
        
        for row_entries in self.entries:
            row_values = [e.get().strip() for e in row_entries]
            
            # Skip empty rows (rows where all cells are empty)
            if all(v == "" for v in row_values):
                continue
                
            formatted_values = []
            for val in row_values:
                if val == "" or val.upper() == "NULL":
                    formatted_values.append("NULL")
                elif self.is_number(val):
                    formatted_values.append(val)
                else:
                    # Escape single quotes by doubling them
                    escaped_val = val.replace("'", "''")
                    formatted_values.append(f"'{escaped_val}'")
            
            value_groups.append(f"({', '.join(formatted_values)})")

        if not value_groups:
            messagebox.showinfo("Info", "Table is empty. Please input data.")
            return

        # Construct Query
        columns_str = ", ".join(self.column_names)
        values_str = ",\n    ".join(value_groups)
        
        sql_query = f"INSERT INTO {self.table_name} ({columns_str})\nVALUES\n    {values_str};"

        self.show_result_window(sql_query)

    def show_result_window(self, sql):
        top = tk.Toplevel(self.root)
        top.title("Generated SQL")
        top.geometry("600x400")

        txt = scrolledtext.ScrolledText(top, wrap=tk.WORD, font=("Consolas", 10))
        txt.pack(fill="both", expand=True, padx=10, pady=10)
        txt.insert(tk.END, sql)
        txt.config(state="disabled") # Read-only

        btn_frame = ttk.Frame(top)
        btn_frame.pack(fill="x", padx=10, pady=5)

        ttk.Button(btn_frame, text="Copy to Clipboard", command=lambda: self.copy_to_clipboard(top, sql)).pack(side="right")

    def copy_to_clipboard(self, window, text):
        window.clipboard_clear()
        window.clipboard_append(text)
        messagebox.showinfo("Success", "SQL copied to clipboard!", parent=window)

    def reset_app(self):
        # Destroy current window and restart (simplest reset method)
        self.root.destroy()
        main()

def main():
    root = tk.Tk()
    app = SQLGeneratorApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()