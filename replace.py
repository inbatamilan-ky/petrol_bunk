import os, re
for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            p = os.path.join(root, f)
            with open(p, 'r', encoding='utf-8') as file:
                content = file.read()
            new_content = re.sub(r"'#FFF'|'#FFFFFF'|'white'", "'#000'", content, flags=re.IGNORECASE)
            new_content = re.sub(r'"#FFF"|"#FFFFFF"|"white"', '"#000"', new_content, flags=re.IGNORECASE)
            if new_content != content:
                with open(p, 'w', encoding='utf-8') as file:
                    file.write(new_content)
