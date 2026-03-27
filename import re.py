import re
import logging

logging.basicConfig(level=logging.WARNING)


def parse_files(filepaths):
    pattern = re.compile(r"^ID:\s*(\d+)\s*\|\s*value=([A-Za-z]?)$")
    result = {}
    invalid_lines = []

    for filepath in filepaths:
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                for line_number, line in enumerate(f, 1):
                    line = line.strip()

                    try:
                        match = pattern.match(line)

                        if not match:
                            invalid_lines.append((line_number, line))
                            continue

                        id_num = int(match.group(1))
                        value = match.group(2) or ""

                        if id_num < 0:
                            logging.warning(f"Invalid ID at line {line_number}")
                            continue

                        if id_num not in result:
                            result[id_num] = value

                    except ValueError as e:
                        logging.warning(f"Parsing error at line {line_number}: {e}")
                        continue

        except FileNotFoundError:
            logging.error(f"File not found: {filepath}")
            return {}, []
        except IOError as e:
            logging.error(f"I/O error: {e}")
            return {}, []

    return result, invalid_lines


def build_sorted_string(result):
    return "".join(value for _, value in sorted(result.items()))


def process_files(filepaths):
    result, invalid_lines = parse_files(filepaths)
    final_string = build_sorted_string(result)
    print(final_string)
    return final_string

process_files(["File A.txt", "File B.txt", "File C.txt"])