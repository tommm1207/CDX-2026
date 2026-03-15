
import sys

def remove_lines(file_path, ranges):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Sort ranges in descending order so index shifts don't affect previous removals
    ranges.sort(key=lambda x: x[0], reverse=True)
    
    for start, end in ranges:
        # line numbers are 1-indexed, so start-1 to end
        del lines[start-1:end]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

if __name__ == "__main__":
    # Ranges gathered from previous Select-String output
    # MaterialGroups: 107 - 822
    # Materials: 824 - 1405
    # Placeholder: 1406 - 1420
    # PageBreadcrumb: 1421 - 1446
    # Trash: 1447 - 1479
    ranges = [
        (107, 822),
        (824, 1405),
        (1406, 1420),
        (1421, 1446),
        (1447, 1479)
    ]
    remove_lines(sys.argv[1], ranges)
