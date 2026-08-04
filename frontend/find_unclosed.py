with open('f:/CMS/cms-main/frontend/src/pages/AttendancePage.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []

for idx, line in enumerate(lines):
    line_num = idx + 1
    # Strip string literals and comments roughly for brace tracking
    clean = line
    for char in clean:
        if char in '{(':
            stack.append((char, line_num))
        elif char == '}':
            if stack and stack[-1][0] == '{':
                stack.pop()
            else:
                print(f"Mismatched }} at line {line_num}")
        elif char == ')':
            if stack and stack[-1][0] == '(':
                stack.pop()
            else:
                print(f"Mismatched ) at line {line_num}")

print("Unclosed elements remaining at end of file:")
for elem, lnum in stack:
    print(f"Unclosed '{elem}' from line {lnum}")
