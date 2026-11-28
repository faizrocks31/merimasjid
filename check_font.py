from fontTools.ttLib import TTFont

font = TTFont('public/fonts/NotoSansDevanagari-Regular.ttf')
print('Tables:', list(font.keys()))
print('GSUB present:', 'GSUB' in font)
if 'GSUB' in font:
    gsub = font['GSUB']
    for script in font['GSUB'].table.ScriptList.ScriptRecord:
        print(f'Script: {script.ScriptTag}')
        if script.ScriptTag == b'dev2' or script.ScriptTag == b'deva':
            print('  Devanagari script found!')
EOF