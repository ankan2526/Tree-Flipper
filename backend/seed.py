from models import Level

# Single demo level matching the defaultLevel from the reference implementation.
# Tree format: flat map { nodeId: { id, children, parentId } }
SAMPLE_LEVELS = [
    {
        "id": "default-1",
        "name": "Starter Puzzle",
        "level_number": 0,
        "tree_data": {
            "tree": {
                "root": {"id": "root", "children": ["a", "b"], "parentId": None},
                "a":    {"id": "a",    "children": ["c", "d"], "parentId": "root"},
                "b":    {"id": "b",    "children": [],          "parentId": "root"},
                "c":    {"id": "c",    "children": [],          "parentId": "a"},
                "d":    {"id": "d",    "children": [],          "parentId": "a"}
            },
            "rootId": "root",
            "targetColors": {
                "root": "blue",
                "a":    "red",
                "b":    "blue",
                "c":    "red",
                "d":    "red"
            }
        }
    }
]

def seed_initial_levels(db):
    try:
        count = db.query(Level).count()
        if count == 0:
            for item in SAMPLE_LEVELS:
                level = Level(
                    id=item["id"],
                    name=item["name"],
                    level_number=item["level_number"],
                    tree_data=item["tree_data"]
                )
                db.add(level)
            db.commit()
            print(f"Seeded {len(SAMPLE_LEVELS)} level(s).")
    except Exception as e:
        db.rollback()
        print(f"Warning: Failed to seed levels: {e}")
