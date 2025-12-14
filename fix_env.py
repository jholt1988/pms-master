import re
import os

env_path = 'tenant_portal_backend/.env'

if not os.path.exists(env_path):
    print(f"File not found: {env_path}")
    exit(1)

with open(env_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("Read .env file.")

# 1. Quote SMTP_PASS if needed
def quote_smtp(match):
    val = match.group(1).rstrip()
    if ' ' in val and not val.startswith('"'):
        print(f"Quoting SMTP_PASS: {val}")
        return f'SMTP_PASS="{val}"'
    return match.group(0)

content = re.sub(r'^SMTP_PASS=(.+)$', quote_smtp, content, flags=re.MULTILINE)

# 2. Fix Private Key multiline -> single line with \n
# Regex to capture the multiline quoted string
# Expects: ESIGN_PROVIDER_PRIVATE_KEY="...
# ...
# "
pattern = r'(ESIGN_PROVIDER_PRIVATE_KEY=")([\s\S]*?)("\s*)'

def fix_key(match):
    prefix = match.group(1)
    key_content = match.group(2)
    suffix = match.group(3)
    
    if '\n' in key_content:
        print("Flattening multiline private key.")
        # Replace actual newlines with literal \n
        # Also clean up any potential leading/trailing whitespace around the key lines if they were indented
        # The key content is between quotes.
        # We want: "-----BEGIN...-----(\n)MII...(\n)...-----END...-----"
        
        # Split by newline
        lines = key_content.splitlines()
        # strip each line? No, headers have spaces. Base64 is continuous but split.
        # Just join with \n literal.
        # But headers: "-----BEGIN RSA PRIVATE KEY-----"
        # We want that to be a line.
        
        cleaned_lines = []
        for line in lines:
            line = line.strip()
            if line:
                cleaned_lines.append(line)
        
        new_key = '\\n'.join(cleaned_lines)
        return f'{prefix}{new_key}{suffix}'
    return match.group(0)

content = re.sub(pattern, fix_key, content)

# 3. Trim trailing spaces from booleans
def trim_bool(match):
    val = match.group(1)
    if val.endswith(' '):
        print(f"Trimming trailing space from: {val}")
        return f'={val.strip()}'
    return match.group(0)

# Matches =true or =false followed by whitespace at end of line
content = re.sub(r'=(true|false)[ \t]+$', trim_bool, content, flags=re.MULTILINE)

# 4. Fix space before = in OPENAI_API_KEY
if 'OPENAI_API_KEY =' in content:
    print("Fixing space in OPENAI_API_KEY")
    content = content.replace('OPENAI_API_KEY =', 'OPENAI_API_KEY=')

with open(env_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Finished fixing .env file.")
