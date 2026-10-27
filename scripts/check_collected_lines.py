#!/usr/bin/env python3
import re
import os

all_lines = {}

def parse_chunk(filename):
    if not os.path.exists(filename):
        return
    with open(filename, 'r', encoding='utf-8') as f:
        for line in f:
            m = re.match(r'^\s*(\d+):\s(.*)$', line)
            if m:
                line_no = int(m.group(1))
                line_content = m.group(2)
                if line_no not in all_lines:
                    all_lines[line_no] = line_content

# Parse from earlier viewed chunks
parse_chunk('recovered_certificates_raw.txt') # 1-100
# Chunk 101-150 can be read from backend or transcript
parse_chunk('step_342.txt') # 150-250
parse_chunk('step_344.txt') # 251-350
parse_chunk('step_346.txt') # 351-450
parse_chunk('lines_450_to_580.txt') # 450-580
parse_chunk('step_348.txt') # 550-650
parse_chunk('step_350.txt') # 651-750
parse_chunk('step_352.txt') # 751-860
parse_chunk('step_354.txt') # 861-918

print(f"Total unique line numbers collected: {len(all_lines)}")
min_line = min(all_lines.keys())
max_line = max(all_lines.keys())
print(f"Range: {min_line} to {max_line}")

missing = [i for i in range(1, max_line + 1) if i not in all_lines]
print(f"Missing lines: {missing}")
